import {
  Cloud,
  Droplets,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from "lucide-react";
import type { Poi, WeatherData } from "../types";
import {
  dayLabel,
  formatTime,
  formatUpdated,
  shortDate,
  weatherMeta,
  windDirectionLabel,
} from "../lib/weather";
import { WeatherIcon } from "./WeatherIcon";

interface WeatherPanelProps {
  poi: Poi;
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function WeatherPanel({ poi, data, loading, error, onRefresh }: WeatherPanelProps) {
  return (
    <section className="detail-section weather-section" aria-labelledby="weather-title">
      <div className="section-heading section-heading--detail">
        <div>
          <p className="eyebrow eyebrow--small">
            <Cloud size={12} aria-hidden="true" /> Open-Meteo
          </p>
          <h2 id="weather-title">Meteo a 7 giorni</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onRefresh}
          aria-label="Aggiorna le previsioni meteo"
          title="Aggiorna previsioni"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "is-spinning" : ""} aria-hidden="true" />
        </button>
      </div>

      {loading && (
        <div className="weather-skeleton" aria-label="Caricamento previsioni">
          <div className="skeleton skeleton--weather-now" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="skeleton skeleton--weather-row" key={index} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="weather-error" role="alert">
          <strong>Previsioni non disponibili</strong>
          <span>{error}</span>
          <button type="button" className="button button--ghost" onClick={onRefresh}>
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && data && <WeatherContent data={data} poi={poi} />}
    </section>
  );
}

function WeatherContent({ data, poi }: { data: WeatherData; poi: Poi }) {
  const current = data.current;
  const meta = weatherMeta(current.weatherCode, current.isDay);
  const today = data.daily[0];
  const min = Math.min(...data.daily.map((day) => day.tempMin));
  const max = Math.max(...data.daily.map((day) => day.tempMax));
  const range = Math.max(1, max - min);

  return (
    <>
      <div className={`weather-now weather-now--${meta.kind}`}>
        <div className="weather-now__main">
          <span className="weather-now__icon">
            <WeatherIcon kind={meta.kind} isDay={current.isDay} size={46} />
          </span>
          <div>
            <span className="weather-now__label">{meta.label}</span>
            <strong className="weather-now__temp">
              {Math.round(current.temperature)}
              <sup>°C</sup>
            </strong>
            <span className="weather-now__feels">
              Percepita {Math.round(current.apparentTemperature)}° · {poi.elevation ? `${poi.elevation} m` : "quota locale"}
            </span>
          </div>
        </div>
        <div className="weather-now__grid">
          <div>
            <Wind size={15} aria-hidden="true" />
            <span>Vento</span>
            <strong>
              {Math.round(current.windSpeed)} km/h {windDirectionLabel(current.windDirection)}
            </strong>
          </div>
          <div>
            <Droplets size={15} aria-hidden="true" />
            <span>Umidità</span>
            <strong>{Math.round(current.humidity)}%</strong>
          </div>
          <div>
            <Cloud size={15} aria-hidden="true" />
            <span>Nuvolosità</span>
            <strong>{Math.round(current.cloudCover)}%</strong>
          </div>
          <div>
            <Sun size={15} aria-hidden="true" />
            <span>UV max</span>
            <strong>{today?.uvIndex != null ? today.uvIndex.toFixed(1) : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="weather-days" aria-label="Previsioni dei prossimi sette giorni">
        {data.daily.map((day, index) => {
          const dayMeta = weatherMeta(day.weatherCode, true);
          const left = ((day.tempMin - min) / range) * 100;
          const width = Math.max(8, ((day.tempMax - day.tempMin) / range) * 100);
          return (
            <div
              className={`forecast-row ${index === 0 ? "is-today" : ""}`}
              key={day.date}
              title={`${dayMeta.label} · vento max ${Math.round(day.windMax)} km/h · raffiche ${Math.round(day.windGustsMax)} km/h`}
            >
              <div className="forecast-row__day">
                <strong>{dayLabel(day.date, index)}</strong>
                <span>{shortDate(day.date)}</span>
              </div>
              <span className={`forecast-row__icon forecast-row__icon--${dayMeta.kind}`}>
                <WeatherIcon kind={dayMeta.kind} size={21} />
              </span>
              <div className="forecast-row__bar" aria-hidden="true">
                <span style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
              </div>
              <div className="forecast-row__temps">
                <span>{Math.round(day.tempMin)}°</span>
                <strong>{Math.round(day.tempMax)}°</strong>
              </div>
              <div className="forecast-row__rain">
                <Droplets size={13} aria-hidden="true" />
                <span>{Math.round(day.precipitationProbability)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="weather-footer">
        <span>
          <Sunrise size={14} aria-hidden="true" /> {today ? formatTime(today.sunrise) : "—"}
          <Sunset size={14} aria-hidden="true" /> {today ? formatTime(today.sunset) : "—"}
        </span>
        <span>
          <Thermometer size={14} aria-hidden="true" /> Dati Open-Meteo · {formatUpdated(data.fetchedAt)}
        </span>
      </div>
    </>
  );
}
