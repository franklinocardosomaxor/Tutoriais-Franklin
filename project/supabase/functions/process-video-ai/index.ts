import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  videoId: string;
  filePath: string;
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { videoId, filePath, userId }: ProcessRequest = await req.json();

    if (!videoId || !filePath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoId, filePath, userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get the user's OpenAI API key from app_settings
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("openai_api_key")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError || !settings?.openai_api_key) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured. Please set it in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = settings.openai_api_key;

    // Download the video file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("videos")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download video file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get file size
    const fileBuffer = await fileData.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    // OpenAI Whisper API accepts files up to 25MB
    // If the file is larger, we need to inform the user
    if (fileSize > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          error: `Video file is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum size for AI processing is 25MB. Please use a smaller video or compress it.`
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine file extension for the upload
    const ext = filePath.split(".").pop() || "mp4";
    const filename = `video.${ext}`;
    const videoBlob = new Blob([fileBuffer], { type: `video/${ext === "mp4" ? "mp4" : "quicktime"}` });

    // Step 1: Transcribe audio using OpenAI Whisper API
    const formData = new FormData();
    formData.append("file", videoBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");
    formData.append("language", "pt");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      return new Response(
        JSON.stringify({ error: `Whisper API error: ${whisperResponse.status} - ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const whisperData = await whisperResponse.json();
    const transcription: string = whisperData.text || "";

    if (!transcription.trim()) {
      return new Response(
        JSON.stringify({ error: "No speech detected in the video" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Classify and summarize using GPT-4o-mini
    const classificationPrompt = `Você é um assistente que analisa transcrições de vídeos de treinamento. Analise a seguinte transcrição e retorne um JSON com estas chaves:

- "title": um título curto e descritivo para o vídeo (máximo 60 caracteres)
- "category": uma sugestão de categoria para este vídeo (ex: "Configuração do Sistema", "Gestão de Usuários")
- "module": uma sugestão de módulo dentro da categoria (ex: "Módulo 01 - Cadastro")
- "summary": um resumo do que será aprendido no vídeo (2-3 frases)
- "objective": o objetivo principal do treinamento (1 frase)
- "key_steps": os passos importantes abordados, separados por linha (uma por linha)

Retorne APENAS o JSON, sem texto adicional.

Transcrição:
${transcription.slice(0, 4000)}`;

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um assistente que classifica conteúdos educacionais. Sempre responda apenas com JSON válido." },
          { role: "user", content: classificationPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    let aiCategory = "";
    let aiModule = "";
    let aiSummary = "";
    let aiKeySteps = "";
    let suggestedTitle = "";

    if (gptResponse.ok) {
      const gptData = await gptResponse.json();
      const content = gptData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          suggestedTitle = parsed.title || "";
          aiCategory = parsed.category || "";
          aiModule = parsed.module || "";
          aiSummary = parsed.summary || "";
          aiKeySteps = parsed.key_steps || "";
        } catch {
          // If JSON parsing fails, just use the transcription
        }
      }
    }

    // Step 3: Update the video record with AI results
    const updateData: Record<string, unknown> = {
      transcription,
      ai_category: aiCategory,
      ai_module: aiModule,
      ai_summary: aiSummary,
      ai_key_steps: aiKeySteps,
      ai_processed: true,
    };

    // If the video has no title yet, use the AI suggested one
    if (suggestedTitle) {
      const { data: existingVideo } = await supabase
        .from("videos")
        .select("title")
        .eq("id", videoId)
        .maybeSingle();

      if (existingVideo && (!existingVideo.title || existingVideo.title.trim() === "")) {
        updateData.title = suggestedTitle;
      }
    }

    const { error: updateError } = await supabase
      .from("videos")
      .update(updateData)
      .eq("id", videoId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to update video: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        ai_category: aiCategory,
        ai_module: aiModule,
        ai_summary: aiSummary,
        ai_key_steps: aiKeySteps,
        suggested_title: suggestedTitle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
