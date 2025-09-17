import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

interface WeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "get_weather_forecast",
      "Get hourly temperature forecast for a given location using longitude and latitude coordinates",
      {
        latitude: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude coordinate (-90 to 90)"),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude coordinate (-180 to 180)"),
      },
      async ({ latitude, longitude }) => {
        try {
          console.log("latitude", latitude);
          console.log("longitude", longitude);

          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m`;
          const response = await fetch(url);

          console.log("response", response);

          if (!response.ok) {
            throw new Error(
              `Weather API request failed: ${response.status} ${response.statusText}`
            );
          }

          const weatherData: WeatherResponse = await response.json();

          console.log("weatherData", weatherData);

          const currentTime = new Date().toISOString();
          const currentHourIndex = weatherData.hourly.time.findIndex(
            (time) => time >= currentTime.slice(0, 13)
          );
          const nextHours = Math.min(
            24,
            weatherData.hourly.time.length - Math.max(0, currentHourIndex)
          );

          const forecast = weatherData.hourly.time
            .slice(
              Math.max(0, currentHourIndex),
              Math.max(0, currentHourIndex) + nextHours
            )
            .map((time, index) => ({
              time,
              temperature:
                weatherData.hourly.temperature_2m[
                  Math.max(0, currentHourIndex) + index
                ],
              unit: weatherData.hourly_units.temperature_2m,
            }));

          console.log("forecast", forecast);

          const text =
            `Weather Forecast for coordinates (${latitude}, ${longitude}):\n\n` +
            `Next ${forecast.length} Hours Temperature Forecast:\n` +
            forecast
              .map((f) => `- ${f.time}: ${f.temperature}${f.unit}`)
              .join("\n");

          console.log("text", text);

          return {
            content: [
              {
                type: "text",
                text: text,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching weather data: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        get_weather_forecast: {
          description:
            "Get hourly temperature forecast for a given location using longitude and latitude coordinates",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
