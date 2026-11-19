import React from 'react';
import {
  LayoutGrid,
  Code,
  BookOpen,
  Briefcase,
  Cpu,
  Terminal,
  Globe,
  Folder,
  Gamepad2,
  Music,
  Video,
  Coffee,
  Sparkles,
  Rocket,
  Compass,
  Monitor,
  Flame,
  Palette,
  Layers,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  'layout-grid': LayoutGrid,
  'code': Code,
  'book-open': BookOpen,
  'briefcase': Briefcase,
  'cpu': Cpu,
  'terminal': Terminal,
  'globe': Globe,
  'folder': Folder,
  'gamepad-2': Gamepad2,
  'music': Music,
  'video': Video,
  'coffee': Coffee,
  'sparkles': Sparkles,
  'rocket': Rocket,
  'compass': Compass,
  'monitor': Monitor,
  'flame': Flame,
  'palette': Palette,
  'layers': Layers,
  'wrench': Wrench,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const AVAILABLE_COLORS = [
  { id: 'blue', label: 'Blue', hex: '#0078d4' },
  { id: 'purple', label: 'Purple', hex: '#8764b8' },
  { id: 'teal', label: 'Teal', hex: '#008272' },
  { id: 'emerald', label: 'Emerald', hex: '#107c41' },
  { id: 'amber', label: 'Amber', hex: '#d83b01' },
  { id: 'rose', label: 'Rose', hex: '#e3008c' },
  { id: 'slate', label: 'Slate', hex: '#605e5c' },
];

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name,
  className,
  size = 20,
  color,
}) => {
  const IconComponent = ICON_MAP[name] || LayoutGrid;
  return <IconComponent size={size} className={className} style={color ? { color } : undefined} />;
};
