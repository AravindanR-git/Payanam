import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Preferences } from "@capacitor/preferences";

const CACHE_KEY = "tripledger_last_location";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

class LocationService {
  async requestPermission() {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    const permission = await Geolocation.requestPermissions();

    return (
      permission.location === "granted" ||
      permission.coarseLocation === "granted"
    );
  }

  async getCachedLocation() {
    try {
      const { value } = await Preferences.get({
        key: CACHE_KEY,
      });

      if (!value) {
        return null;
      }

      const cached = JSON.parse(value);

      if (!cached.timestamp) {
        return null;
      }

      const age = Date.now() - cached.timestamp;

      if (age > CACHE_DURATION) {
        await this.clearCache();
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  }

  async cacheLocation(location) {
    try {
      await Preferences.set({
        key: CACHE_KEY,
        value: JSON.stringify({
          ...location,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Ignore cache failures
    }
  }

  async clearCache() {
    try {
      await Preferences.remove({
        key: CACHE_KEY,
      });
    } catch {
      // Ignore
    }
  }

  async getCurrentLocation(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = await this.getCachedLocation();

      if (cached) {
        return {
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy ?? null,
          locationName: cached.locationName,
          source: "cache",
        };
      }
    }

    try {
      const granted = await this.requestPermission();

      if (!granted) {
        return {
          latitude: null,
          longitude: null,
          accuracy: null,
          locationName: "",
          source: "permission-denied",
        };
      }

      let position;

      if (Capacitor.isNativePlatform()) {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      } else {
        position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
      }

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        locationName: await this.reverseGeocode(
          position.coords.latitude,
          position.coords.longitude
        ),
      };

      await this.cacheLocation(location);

      return {
        ...location,
        source: "gps",
      };
    } catch (error) {
      const isPermissionDenied =
        error &&
        (error.code === 1 ||
          error.PERMISSION_DENIED ||
          error.message?.includes('User denied Geolocation') ||
          error.message?.includes('permission denied'));

      if (!isPermissionDenied) {
        console.error("Location Error:", error);
      }

      const cached = await this.getCachedLocation();

      if (cached) {
        return {
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy ?? null,
          locationName: cached.locationName,
          source: "cache-fallback",
        };
      }

      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        locationName: "",
        source: "unavailable",
      };
    }
  }

  async reverseGeocode(latitude, longitude) {
    try {
      if (!GEOAPIFY_API_KEY) {
        return "";
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${GEOAPIFY_API_KEY}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        return "";
      }

      const data = await response.json();

      return data.results?.[0]?.formatted || "";
    } catch {
      return "";
    }
  }

  async searchLocations(query) {
    const searchQuery = query.trim();

    if (!searchQuery) {
      return [];
    }

    if (!GEOAPIFY_API_KEY) {
      return [];
    }

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          searchQuery
        )}&limit=5&format=json&apiKey=${GEOAPIFY_API_KEY}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data.results || [])
        .map((result) => ({
          locationName: result.formatted,
          latitude: Number(result.lat),
          longitude: Number(result.lon),
        }))
        .filter(
          (result) =>
            Number.isFinite(result.latitude) &&
            Number.isFinite(result.longitude)
        );
    } catch {
      return [];
    }
  }
}

export default new LocationService();
