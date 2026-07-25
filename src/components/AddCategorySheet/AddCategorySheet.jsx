import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import CategoryRepository from "../../database/repositories/CategoryRepository";

function AddCategorySheet({

  isOpen,

  onClose,

  category = null,

  onSaved,

}) {

  const [name, setName] = useState("");

  const [icon, setIcon] = useState("📂");

  useEffect(() => {

    if (!isOpen) return;

    if (category) {

      setName(category.name || "");

      setIcon(category.icon || "📂");

    } else {

      setName("");

      setIcon("📂");

    }

  }, [category, isOpen]);

  const saveCategory = async () => {

    if (!name.trim()) {

      alert("Enter category name");

      return;

    }

    if (category) {

      await CategoryRepository.updateCategory(

        category.id,

        {

          name,

          icon,

        }

      );

    } else {

      await CategoryRepository.createCategory({

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

        category

          ? "Edit Category"

          : "Add Category"

      }

    >

      <input

        className="sheet-input"

        placeholder="Category Name"

        value={name}

        onChange={(e)=>

          setName(e.target.value)

        }

      />

      <input

        className="sheet-input"

        placeholder="Emoji (📂 🍔 ⛽ 🏨)"

        value={icon}

        onChange={(e)=>

          setIcon(e.target.value)

        }

      />

      <Button

        onClick={saveCategory}

      >

        {

          category

            ? "Update Category"

            : "Save Category"

        }

      </Button>

    </BottomSheet>

  );

}

export default AddCategorySheet;