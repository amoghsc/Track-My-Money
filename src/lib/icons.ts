import {
  Utensils, ShoppingCart, ShoppingBag, Car, House, Receipt, Clapperboard, Fuel, Plane, Users, Heart, BookOpen, Gift, Dumbbell,
  Sparkles, Briefcase, Package, Wallet, Building2, Coins, TrendingUp, Undo2, Plus, Coffee, Pizza, Beer, CakeSlice, Apple, Carrot,
  Milk, EggFried, Shirt, Footprints, Watch, Glasses, Gem, Baby, Bus, TrainFront, Bike, Ship, ParkingSquare, Wrench, Lightbulb,
  Droplets, Flame, Sofa, Hammer, Bed, WashingMachine, Smartphone, Wifi, CreditCard, Landmark, FileText, Shield, Scale, Gamepad2,
  Music, Mic, Tv, Ticket, Dice5, Book, GraduationCap, School, Pill, Stethoscope, Activity, Dog, Cat, PawPrint, HeartHandshake,
  HandHeart, Flower2, PartyPopper, Cake, Laptop, Printer, Armchair, Banknote, PiggyBank, ChartLine, Trophy, CircleHelp, Star, Target,
  BusFront, Truck, MapPin, Globe, Umbrella, Tent, Hotel, UtensilsCrossed, Wine, Soup, IceCreamCone, Salad, Sandwich, Cookie, Candy,
  Cigarette, Scissors, Brush, SprayCan, Leaf, Sun, Moon, CloudRain, type LucideIcon,
} from 'lucide-react'

/** Curated Lucide icons for categories, keyed by Lucide's kebab-case name (stored in xp_categories.icon). */
export const ICONS: Record<string, LucideIcon> = {
  // food
  utensils: Utensils, 'utensils-crossed': UtensilsCrossed, coffee: Coffee, pizza: Pizza, beer: Beer, wine: Wine, soup: Soup, salad: Salad,
  sandwich: Sandwich, 'cake-slice': CakeSlice, cake: Cake, cookie: Cookie, candy: Candy, 'ice-cream-cone': IceCreamCone, apple: Apple,
  carrot: Carrot, milk: Milk, 'egg-fried': EggFried, 'shopping-cart': ShoppingCart,
  // shopping & personal
  'shopping-bag': ShoppingBag, shirt: Shirt, footprints: Footprints, watch: Watch, glasses: Glasses, gem: Gem, sparkles: Sparkles,
  scissors: Scissors, brush: Brush, 'spray-can': SprayCan, gift: Gift, cigarette: Cigarette,
  // transport
  car: Car, fuel: Fuel, bus: Bus, 'bus-front': BusFront, 'train-front': TrainFront, bike: Bike, plane: Plane, ship: Ship, truck: Truck,
  'parking-square': ParkingSquare, 'map-pin': MapPin, globe: Globe, hotel: Hotel, tent: Tent, umbrella: Umbrella,
  // home
  house: House, sofa: Sofa, armchair: Armchair, bed: Bed, hammer: Hammer, wrench: Wrench, lightbulb: Lightbulb, droplets: Droplets,
  flame: Flame, 'washing-machine': WashingMachine, leaf: Leaf, 'flower-2': Flower2,
  // bills
  receipt: Receipt, smartphone: Smartphone, wifi: Wifi, 'credit-card': CreditCard, landmark: Landmark, 'file-text': FileText,
  shield: Shield, scale: Scale,
  // fun
  clapperboard: Clapperboard, tv: Tv, 'gamepad-2': Gamepad2, music: Music, mic: Mic, ticket: Ticket, 'dice-5': Dice5,
  'party-popper': PartyPopper, dumbbell: Dumbbell, trophy: Trophy, target: Target,
  // learning
  book: Book, 'book-open': BookOpen, 'graduation-cap': GraduationCap, school: School,
  // health & family
  heart: Heart, pill: Pill, stethoscope: Stethoscope, activity: Activity, baby: Baby, users: Users, 'heart-handshake': HeartHandshake,
  'hand-heart': HandHeart, dog: Dog, cat: Cat, 'paw-print': PawPrint,
  // work & money
  briefcase: Briefcase, laptop: Laptop, printer: Printer, 'building-2': Building2, wallet: Wallet, banknote: Banknote, coins: Coins,
  'piggy-bank': PiggyBank, 'trending-up': TrendingUp, 'chart-line': ChartLine, 'undo-2': Undo2, plus: Plus, package: Package,
  star: Star, 'circle-help': CircleHelp, sun: Sun, moon: Moon, 'cloud-rain': CloudRain,
}
export const ICON_NAMES = Object.keys(ICONS)
export const DEFAULT_ICON = 'package'
