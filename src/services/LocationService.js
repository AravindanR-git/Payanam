import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

class LocationService {

  async requestPermission() {

    if (Capacitor.isNativePlatform()) {

      const permission =
        await Geolocation.requestPermissions();

      return (
        permission.location === "granted"
      );

    }

    return true;

  }

  async getCurrentLocation() {

    try {

      await this.requestPermission();

      let position;

      if (Capacitor.isNativePlatform()) {

        position =
          await Geolocation.getCurrentPosition({

            enableHighAccuracy: true,

            timeout: 10000,

          });

      } else {

        position =
          await new Promise((resolve, reject) => {

            navigator.geolocation.getCurrentPosition(

              resolve,

              reject,

              {

                enableHighAccuracy: true,

                timeout: 10000,

              }

            );

          });

      }

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      const locationName =
        await this.reverseGeocode(
          latitude,
          longitude
        );

      return {

        latitude,

        longitude,

        locationName,

      };

    } catch (error) {

      console.error(error);

      return {

        latitude: null,

        longitude: null,

        locationName: "",

      };

    }

  }

  async reverseGeocode(
    latitude,
    longitude
  ) {

    try {

      const response =
        await fetch(

`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`

        );

      const data =
        await response.json();

      return (

        data.display_name ||

        ""

      );

    } catch {

      return "";

    }

  }

}

export default new LocationService();