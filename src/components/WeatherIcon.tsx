import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MoonStar,
  Sun,
} from "lucide-react";
import type { WeatherKind } from "../lib/weather";

interface WeatherIconProps {
  kind: WeatherKind;
  isDay?: boolean;
  size?: number;
  className?: string;
}

export function WeatherIcon({ kind, isDay = true, size = 24, className }: WeatherIconProps) {
  const common = { size, strokeWidth: 1.7, className, "aria-hidden": true as const };
  if (kind === "clear") return isDay ? <Sun {...common} /> : <MoonStar {...common} />;
  if (kind === "partly") return isDay ? <CloudSun {...common} /> : <Cloud {...common} />;
  if (kind === "fog") return <CloudFog {...common} />;
  if (kind === "drizzle") return <CloudDrizzle {...common} />;
  if (kind === "rain") return <CloudRain {...common} />;
  if (kind === "snow") return <CloudSnow {...common} />;
  if (kind === "storm") return <CloudLightning {...common} />;
  return <Cloud {...common} />;
}
