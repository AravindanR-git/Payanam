import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import ItemRepository from "../../database/repositories/ItemRepository";

function AddItemSheet({

  isOpen,

  onClose,

  category,

  item = null,

  onSaved,

}) {

  const [name, setName] = useState("");

  const [icon, setIcon] = useState("📦");

  useEffect(() => {

    if (!isOpen) return;

    if (item) {

      setName(item.name || "");

      setIcon(item.icon || "📦");

    } else {

      setName("");

      setIcon("📦");

    }

  }, [item, isOpen]);

  const saveItem = async () => {

    if (!name.trim()) {

      alert("Enter item name");

      return;

    }

    if (item) {

      await ItemRepository.updateItem(

        item.id,

        {

          name,

          icon,

        }

      );

    } else {

      await ItemRepository.createItem({

        categoryId: category.id,

        name,

        icon,

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

        item

          ? "Edit Item"

          : "Add Item"

      }

    >

      <input

        className="sheet-input"

        placeholder="Item Name"

        value={name}

        onChange={(e)=>

          setName(e.target.value)

        }

      />

      <input

        className="sheet-input"

        placeholder="Emoji (🍔 ⛽ 🏨)"

        value={icon}

        onChange={(e)=>

          setIcon(e.target.value)

        }

      />

      <Button

        onClick={saveItem}

      >

        {

          item

            ? "Update Item"

            : "Save Item"

        }

      </Button>

    </BottomSheet>

  );

}

export default AddItemSheet;