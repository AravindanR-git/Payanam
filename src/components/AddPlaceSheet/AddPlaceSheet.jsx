import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import PlaceRepository from "../../database/repositories/PlaceRepository";
import useLanguage from "../../i18n/useLanguage";

function AddPlaceSheet({
  isOpen,
  onClose,
  place = null,
  onSaved,
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");

  useEffect(() => {

    if (!isOpen) return;

    if (place) {

      setName(place.name);

    } else {

      setName("");

    }

  }, [place, isOpen]);

  const savePlace = async () => {

    if (!name.trim()) {

      alert(t("enterPlaceName"));

      return;

    }

    if (place) {

      await PlaceRepository.updatePlace(

        place.id,

        {

          name,

        }

      );

    } else {

      await PlaceRepository.createPlace({

        name,

      });

    }

    if (onSaved) {

      await onSaved();

    }

    onClose();

  };

  return (

    <BottomSheet

      isOpen={isOpen}

      onClose={onClose}

      title={

        place

          ? t("editPlace")

          : t("addPlace")

      }

    >

      <input

        className="sheet-input"

        placeholder={t("placeName")}

        value={name}

        onChange={(e)=>

          setName(e.target.value)

        }

      />

      <Button

        onClick={savePlace}

      >

        {

          place

            ? t("updatePlace")

            : t("savePlace")

        }

      </Button>

    </BottomSheet>

  );

}

export default AddPlaceSheet;
