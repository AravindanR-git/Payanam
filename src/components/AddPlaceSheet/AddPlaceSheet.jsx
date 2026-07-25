import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import PlaceRepository from "../../database/repositories/PlaceRepository";

function AddPlaceSheet({

  isOpen,

  onClose,

  place = null,

  onSaved,

}) {

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

      alert("Enter place name");

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

          ? "Edit Place"

          : "Add Place"

      }

    >

      <input

        className="sheet-input"

        placeholder="Place Name"

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

            ? "Update Place"

            : "Save Place"

        }

      </Button>

    </BottomSheet>

  );

}

export default AddPlaceSheet;