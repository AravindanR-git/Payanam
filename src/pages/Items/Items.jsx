import "./Items.css";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import IconAvatar from "../../components/IconAvatar/IconAvatar";

import ItemRepository from "../../database/repositories/ItemRepository";
import AddItemSheet from "../../components/AddItemSheet/AddItemSheet";

function Items() {

  const navigate = useNavigate();

  const { state } = useLocation();

  const category = state?.category;

  const [items, setItems] = useState([]);

  const [showSheet, setShowSheet] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState(null);

  useEffect(() => {

    if (!category) {

      navigate("/categories");

      return;

    }

    loadItems();

  }, []);

  const loadItems = async () => {

    const list =
      await ItemRepository.getItems(
        category.id
      );

    setItems(list);

  };

  const addItem = () => {

    setSelectedItem(null);

    setShowSheet(true);

  };

  const editItem = (item) => {

    setSelectedItem(item);

    setShowSheet(true);

  };

  const deleteItem = async (item) => {

    const ok = window.confirm(
      `Delete "${item.name}" ?`
    );

    if (!ok) return;

    await ItemRepository.deleteItem(
      item.id
    );

    loadItems();

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >

          <IconAvatar
            icon={category.icon}
            name={category.name}
            size={44}
          />

          <h1>

            {category.name}

          </h1>

        </div>

        <p>

          Manage expense items

        </p>

      </div>

      {

        items.length === 0 ?

        <div className="empty-card">

          <h3>No Items</h3>

          <p>

            Add your first expense item.

          </p>

        </div>

        :

        <div className="items-list">

          {

            items.map(item => (

              <div
                key={item.id}
                className="item-card"
              >

                <div className="item-left">

                  <IconAvatar
                    icon={item.icon}
                    name={item.name}
                    size={40}
                  />

                  <div className="item-text">

                    <span className="item-title">

                      {item.name}

                    </span>

                  </div>

                </div>

                <div className="item-actions">

                  <button

                    className="item-action"

                    onClick={(e) => {

                      e.stopPropagation();

                      editItem(item);

                    }}

                  >

                    <Pencil size={18}/>

                  </button>

                  <button

                    className="item-action delete"

                    onClick={(e) => {

                      e.stopPropagation();

                      deleteItem(item);

                    }}

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
        onClick={addItem}
      >

        <Plus size={26}/>

      </button>

      <AddItemSheet

        isOpen={showSheet}

        onClose={() => {

          setShowSheet(false);

          setSelectedItem(null);

        }}

        category={category}

        item={selectedItem}

        onSaved={loadItems}

      />

    </div>

  );

}

export default Items;