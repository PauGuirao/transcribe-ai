import {
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  User,
  type LucideIcon,
} from "lucide-react";

export interface SidebarMenuEntry {
  /** Translation key under `dashboard.sidebar` */
  key: "home" | "library" | "students" | "blog" | "tutorials";
  path: string;
  icon: LucideIcon;
}

export const SIDEBAR_MENU: ReadonlyArray<SidebarMenuEntry> = [
  { key: "home", path: "/dashboard", icon: Home },
  { key: "library", path: "/transcriptions", icon: BookOpen },
  { key: "students", path: "/profiles", icon: User },
  { key: "blog", path: "/blog", icon: FileText },
  { key: "tutorials", path: "/tutorials", icon: GraduationCap },
];
