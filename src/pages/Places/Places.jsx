import "./Places.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";

import PlaceRepository from "../../database/repositories/PlaceRepository";

import AddPlaceSheet from "../../components/AddPlaceSheet/AddPlaceSheet";

function Places() {

  const navigate = useNavigate();

  const [places, setPlaces] = useState([]);

  const [showSheet, setShowSheet] =
    useState(false);

  const [selectedPlace, setSelectedPlace] =
    useState(null);

  useEffect(() => {

    loadPlaces();

  }, []);

  const loadPlaces = async () => {

    const list =
      await PlaceRepository.getPlaces();

    setPlaces(list);

  };

  const addPlace = () => {

    setSelectedPlace(null);

    setShowSheet(true);

  };

  const editPlace = (place) => {

    setSelectedPlace(place);

    setShowSheet(true);

  };

  const deletePlace = async (place) => {

    const ok = window.confirm(

      `Delete "${place.name}"?`

    );

    if (!ok) return;

    await PlaceRepository.deletePlace(
      place.id
    );

    loadPlaces();

  };

  return (

    <div className="items-page">

      <button

        className="back-btn"

        onClick={() => navigate(-1)}

      >

        <ArrowLeft size={20}/>

      </button>

      <div className="items-header">

        <h1>

          📍 Places

        </h1>

        <p>

          Manage your saved places.

        </p>

      </div>

      {

        places.length === 0 ?

        <div className="empty-card">

          <MapPin size={48}/>

          <h3>

            No Places

          </h3>

          <p>

            Add your frequently used places.

          </p>

        </div>

        :

        <div className="items-list">

          {

            places.map(place => (

              <div

                key={place.id}

                className="item-card"

              >

                <div className="item-left">

                  <div className="item-icon">

                    📍

                  </div>

                  <div className="item-text">

                    <span className="item-title">

                      {place.name}

                    </span>

                  </div>

                </div>

                <div className="item-actions">

                  <button

                    className="item-action"

                    onClick={() =>
                      editPlace(place)
                    }

                  >

                    <Pencil size={18}/>

                  </button>

                  <button

                    className="item-action delete"

                    onClick={() =>
                      deletePlace(place)
                    }

                  >

                    <Trash2 size={18}/>

                  </button>

                </div>

              </div>

            ))

          }

        </div>

      }

      <button

        className="floating-btn"

        onClick={addPlace}

      >

        <Plus size={26}/>

      </button>

      <AddPlaceSheet

        isOpen={showSheet}

        onClose={() => {

          setShowSheet(false);

          setSelectedPlace(null);

        }}

        place={selectedPlace}

        onSaved={loadPlaces}

      />

    </div>

  );

}

export default Places;