import type { LucideProps } from 'lucide-react-native';
import Bell from 'lucide-react-native/icons/bell';
import BriefcaseBusiness from 'lucide-react-native/icons/briefcase-business';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CodeXml from 'lucide-react-native/icons/code-xml';
import Coffee from 'lucide-react-native/icons/coffee';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import FileText from 'lucide-react-native/icons/file-text';
import Globe from 'lucide-react-native/icons/globe';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Heart from 'lucide-react-native/icons/heart';
import House from 'lucide-react-native/icons/house';
import Languages from 'lucide-react-native/icons/languages';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import List from 'lucide-react-native/icons/list';
import Palette from 'lucide-react-native/icons/palette';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import Share from 'lucide-react-native/icons/share';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Star from 'lucide-react-native/icons/star';
import Trash from 'lucide-react-native/icons/trash';
import Users from 'lucide-react-native/icons/users';
import X from 'lucide-react-native/icons/x';
import { metrics, palette } from './tokens';

// Static imports keep the icon set explicit; location keys remain compatible with saved data.
const icons = {
  home: House,
  list: List,
  bell: Bell,
  bulb: Lightbulb,
  work: BriefcaseBusiness,
  school: GraduationCap,
  shop: ShoppingCart,
  gym: Dumbbell,
  parents: Users,
  cafe: Coffee,
  heart: Heart,
  edit: Pencil,
  trash: Trash,
  plus: Plus,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  check: Check,
  close: X,
  feed: FileText,
  github: CodeXml,
  language: Languages,
  rate: Star,
  settings: Settings,
  share: Share,
  style: Palette,
  support: LifeBuoy,
  website: Globe,
};

export type AppIconProps = LucideProps & { name: keyof typeof icons };

export function AppIcon({ name, color = palette.text, size = metrics.icon, strokeWidth = metrics.iconStroke, ...props }: AppIconProps) {
  const Icon = icons[name];
  return <Icon color={color} size={size} strokeWidth={strokeWidth} {...props} />;
}
