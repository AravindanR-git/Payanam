import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";

import CategoryStep from "./CategoryStep";
import ItemStep from "./ItemStep";
import DetailsStep from "./DetailsStep";

import CategoryRepository from "../../database/repositories/CategoryRepository";
import ItemRepository from "../../database/repositories/ItemRepository";

function AddExpenseSheet({
  isOpen,
  onClose,
  trip,
  onExpenseSaved,
}) {
  const [step, setStep] = useState(1);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [selectedItems, setSelectedItems] =
    useState([]);

  useEffect(() => {
    if (isOpen) {
      resetSheet();
      loadCategories();
    }
  }, [isOpen]);

  const resetSheet = () => {
    setStep(1);

    setSelectedCategory(null);

    setSelectedItems([]);

    setItems([]);
  };

  const goToCategories = () => {
    setSelectedCategory(null);

    setSelectedItems([]);

    setItems([]);

    setStep(1);
  };

  const loadCategories = async () => {
    if (!trip) return;

    const list =
      await CategoryRepository.getCategories();

    setCategories(list);
  };

  const handleCategory = async (category) => {
    setSelectedCategory(category);

    setSelectedItems([]);

    const list =
      await ItemRepository.getItems(category.id);

    setItems(list);

    setStep(2);
  };

  const handleItems = (items) => {
    setSelectedItems(items);

    setStep(3);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense"
    >
      {step === 1 && (
        <CategoryStep
          categories={categories}
          onSelect={handleCategory}
          onBack={onClose}
        />
      )}

      {step === 2 && (
        <ItemStep
          category={selectedCategory}
          items={items}
          selectedItems={selectedItems}
          onBack={goToCategories}
          onContinue={handleItems}
        />
      )}

      {step === 3 && (
        <DetailsStep
          trip={trip}
          category={selectedCategory}
          selectedItems={selectedItems}
          onBack={() => {
            setStep(2);
          }}
          onClose={onClose}
          onSaved={onExpenseSaved}
        />
      )}
    </BottomSheet>
  );
}

export default AddExpenseSheet;