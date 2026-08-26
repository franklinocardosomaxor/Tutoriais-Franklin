export type UserRole = 'admin' | 'student' | 'collaborator' | 'tutor';

export type VideoStatus = 'pending' | 'implemented';
export type ImageStatus = 'pending' | 'viewed' | 'concluded';
export type LinkStatus = 'consulted' | 'favorite';
export type DocumentStatus = 'pending' | 'studied';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tutor {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  specialty: string | null;
  bio: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Module {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  category?: Category;
}

export interface Video {
  id: string;
  user_id: string;
  module_id: string | null;
  tutor_id: string | null;
  title: string;
  url: string | null;
  embed_url: string | null;
  description: string | null;
  objective: string | null;
  key_steps: string | null;
  status: VideoStatus;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  module?: Module;
  tutor?: Tutor;
  transcription: string | null;
  ai_category: string | null;
  ai_module: string | null;
  ai_summary: string | null;
  ai_key_steps: string | null;
  ai_processed: boolean;
  file_path: string | null;
}

export interface AppSettings {
  id: string;
  user_id: string;
  openai_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  user_id: string;
  module_id: string | null;
  step_number: number;
  image_url: string | null;
  title: string;
  explanation: string | null;
  tutor_notes: string | null;
  status: ImageStatus;
  sort_order: number;
  created_at: string;
  module?: Module;
}

export interface Link {
  id: string;
  user_id: string;
  module_id: string | null;
  tutor_id: string | null;
  site_name: string;
  url: string;
  purpose: string | null;
  status: LinkStatus;
  created_at: string;
  module?: Module;
  tutor?: Tutor;
}

export interface Document {
  id: string;
  user_id: string;
  module_id: string | null;
  title: string;
  file_url: string | null;
  description: string | null;
  status: DocumentStatus;
  created_at: string;
  module?: Module;
}
