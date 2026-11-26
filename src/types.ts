export type PoiKind = "peak" | "hut" | "webcam";

export interface BasePoi {
  id: string;
  kind: PoiKind;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
  group: string;
  province?: string;
  description: string;
  imageUrl: string | null;
  imageCredit: string | null;
  sourceUrl: string;
  sourceLabel: string;
  tags: string[];
  featured: boolean;
}

export interface PeakPoi extends BasePoi {
  kind: "peak";
}

export interface HutPoi extends BasePoi {
  kind: "hut";
}

export interface WebcamPoi extends BasePoi {
  kind: "webcam";
  webcamKey: string;
  accuracy: "locality" | "approx";
}

export type Poi = PeakPoi | HutPoi | WebcamPoi;

export interface Dataset {
  peaks: PeakPoi[];
  huts: HutPoi[];
  webcams: WebcamPoi[];
  all: Poi[];
}

export interface DatasetMeta {
  generatedAt: string;
  counts: {
    peaks: number;
    huts: number;
    webcams: number;
    total: number;
  };
  sources: Array<{
    label: string;
    url: string;
    license: string;
  }>;
}

export type MapStyle = "relief" | "satellite" | "light";

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  sunrise: string;
  sunset: string;
  uvIndex: number;
  precipitationSum: number;
  precipitationProbability: number;
  windMax: number;
  windGustsMax: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  fetchedAt: number;
  timezone: string;
  elevation: number;
}

export interface WeatherState {
  status: "idle" | "loading" | "success" | "error";
  data: WeatherData | null;
  error: string | null;
}
