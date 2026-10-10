import Svg, { Path } from 'react-native-svg';

const paths = {
  home: 'M3 10L12 3L21 10V21H15V14H9V21H3Z',
  list: 'M7 6H21M7 12H21M7 18H21M3 6H3.1M3 12H3.1M3 18H3.1',
  bell: 'M6 8A6 6 0 0 1 18 8V14L21 18H3L6 14ZM10 21H14',
  bulb: 'M9 18H15M10 21H14M8 14C2 8 7 2 12 2C17 2 22 8 16 14L15 17H9Z',
  work: 'M3 7H21V21H3ZM8 7V3H16V7M3 12H21M10 12V15H14V12',
  school: 'M2 8L12 3L22 8L12 13ZM5 10V17L12 21L19 17V10M22 8V17',
  shop: 'M2 3H5L8 16H19L22 7H6M9 21H9.1M18 21H18.1',
  gym: 'M7 7L17 17M4 10L10 4M14 20L20 14M2 8L8 2M16 22L22 16',
  parents: 'M8 8A3 3 0 1 0 8 2A3 3 0 0 0 8 8M16 8A3 3 0 1 0 16 2A3 3 0 0 0 16 8M3 22V12H10V22M14 22V12H21V22',
  cafe: 'M3 4H17V16H3ZM17 5H21V11H17M2 21H18',
  heart: 'M12 21L3 12C-3 3 7-2 12 5C17-2 27 3 21 12Z',
  edit: 'M4 20L5 14L17 2L22 7L10 19ZM14 5L19 10',
  trash: 'M3 6H21M9 6V3H15V6M6 6L7 21H17L18 6M10 10V17M14 10V17',
  plus: 'M12 4V20M4 12H20',
};

export function SvitloIcon({ name, color = '#FFFFFF', size = 24 }: { name: keyof typeof paths; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={paths[name]} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
