import {
  Armchair, BedDouble, BookOpen, Bike, Calculator, CookingPot, Cpu, Dumbbell, FileText, FlaskConical,
  MapPin, Music, Package, Palette, PenLine, Shirt, Smartphone, type LucideIcon,
} from 'lucide-react';

export const CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: 'Books', icon: BookOpen },
  { name: 'Notes & study material', icon: FileText },
  { name: 'Lab gear', icon: FlaskConical },
  { name: 'Calculators', icon: Calculator },
  { name: 'Electronics', icon: Cpu },
  { name: 'Mobile & accessories', icon: Smartphone },
  { name: 'Stationery', icon: PenLine },
  { name: 'Cycles', icon: Bike },
  { name: 'Hostel essentials', icon: BedDouble },
  { name: 'Furniture', icon: Armchair },
  { name: 'Kitchen & appliances', icon: CookingPot },
  { name: 'Clothing & uniforms', icon: Shirt },
  { name: 'Sports & fitness', icon: Dumbbell },
  { name: 'Musical instruments', icon: Music },
  { name: 'Art & craft', icon: Palette },
  { name: 'Accommodation', icon: MapPin },
  { name: 'Other', icon: Package },
];

export const categoryIcon = (name: string): LucideIcon => CATEGORIES.find(c => c.name === name)?.icon ?? Package;
