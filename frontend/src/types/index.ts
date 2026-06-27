export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
}

export interface Tree {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  tree_id: string;
  parent_id: string | null;
  title: string;
  done: boolean;
  note: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: Todo[];
}

export interface MindMapPosition {
  todo_id: string;
  tree_id: string;
  x: number;
  y: number;
  updated_at: string;
}

export interface TreeResponse {
  tree: Tree;
  todos: Todo[];
}
