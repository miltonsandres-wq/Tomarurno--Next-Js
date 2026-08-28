import {
  Building2,
  Car,
  CreditCard,
  Droplet,
  FileText,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
  Scale,
  ShieldCheck,
  Stethoscope,
  TreePine,
  Trash2,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ICONOS_SERVICIO: { valor: string; etiqueta: string; Icono: LucideIcon }[] = [
  { valor: "Landmark", etiqueta: "Trámites municipales", Icono: Landmark },
  { valor: "Building2", etiqueta: "Catastro / edificios", Icono: Building2 },
  { valor: "FileText", etiqueta: "Documentos / registro", Icono: FileText },
  { valor: "Trash2", etiqueta: "Aseo / residuos", Icono: Trash2 },
  { valor: "Home", etiqueta: "Vivienda", Icono: Home },
  { valor: "Car", etiqueta: "Tránsito / vehículos", Icono: Car },
  { valor: "Droplet", etiqueta: "Agua", Icono: Droplet },
  { valor: "Zap", etiqueta: "Energía", Icono: Zap },
  { valor: "Scale", etiqueta: "Legal / justicia", Icono: Scale },
  { valor: "Stethoscope", etiqueta: "Salud", Icono: Stethoscope },
  { valor: "ShieldCheck", etiqueta: "Seguridad", Icono: ShieldCheck },
  { valor: "Users", etiqueta: "Atención ciudadana", Icono: Users },
  { valor: "CreditCard", etiqueta: "Pagos / impuestos", Icono: CreditCard },
  { valor: "MapPin", etiqueta: "Ubicación / permisos", Icono: MapPin },
  { valor: "GraduationCap", etiqueta: "Educación", Icono: GraduationCap },
  { valor: "TreePine", etiqueta: "Medio ambiente", Icono: TreePine },
];

const ICONO_POR_DEFECTO = Landmark;

export function obtenerIconoServicio(valor: string | null | undefined): LucideIcon {
  return ICONOS_SERVICIO.find((i) => i.valor === valor)?.Icono ?? ICONO_POR_DEFECTO;
}
