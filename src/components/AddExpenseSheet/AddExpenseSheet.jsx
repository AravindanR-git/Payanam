import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";

import CategoryStep from "./CategoryStep";
import ItemStep from "./ItemStep";
import DetailsStep from "./DetailsStep";

import AddCategorySheet from "../AddCategorySheet/AddCategorySheet";
import AddItemSheet from "../AddItemSheet/AddItemSheet";

import CategoryRepository from "../../database/repositories/CategoryRepository";
import ItemRepository from "../../database/repositories/ItemRepository";

function AddExpenseSheet({
  isOpen,
  onClose,
  trip,
  onExpenseSaved,
  expense = null,
}) {
  const [step, setStep] = useState(1);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [selectedItems, setSelectedItems] =
    useState([]);

  const [showCategorySheet, setShowCategorySheet] =
    useState(false);

  const [showItemSheet, setShowItemSheet] =
    useState(false);

  useEffect(() => {

  if (!isOpen) return;

  loadCategories();

  if (expense) {

    setSelectedCategory({
      id: expense.categoryId,
      name: expense.categoryName,
    });

    setSelectedItems(expense.selectedItems || []);

    loadItems(expense.categoryId);

    setStep(3);

  } else {

    resetSheet();

  }

}, [isOpen, expense]);

  const resetSheet = () => {
    setStep(1);

    setSelectedCategory(null);

    setSelectedItems([]);

    setItems([]);

    setShowCategorySheet(false);

    setShowItemSheet(false);
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
      await CategoryRepository.getCategories(
        trip.tripType,
        trip.userId
      );

    setCategories(list);
  };

  const loadItems = async (categoryId) => {
    const list =
      await ItemRepository.getItems(categoryId);

    setItems(list);
  };

  const handleCategory = async (category) => {
    setSelectedCategory(category);

    setSelectedItems([]);

    await loadItems(category.id);

    setStep(2);
  };

  const handleItems = (items) => {
    setSelectedItems(items);

    setStep(3);
  };

  const handleCategoryCreated = async (
    category
  ) => {
    await loadCategories();

    setSelectedCategory(category);

    setSelectedItems([]);

    await loadItems(category.id);

    setShowCategorySheet(false);

    setShowItemSheet(true);
  };

  const handleItemCreated = async (item) => {
    await loadItems(item.categoryId);

    setSelectedItems([
      {
        id: item.id,
        name: item.name,
        icon: item.icon,
      },
    ]);

    setShowItemSheet(false);

    setStep(3);
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={expense ? "Edit Expense" : "Add Expense"}
      >
        {step === 1 && (
          <CategoryStep
            categories={categories}
            onSelect={handleCategory}
            onBack={onClose}
            onAddCategory={() =>
              setShowCategorySheet(true)
            }
          />
        )}

        {step === 2 && (
          <ItemStep
            category={selectedCategory}
            items={items}
            selectedItems={selectedItems}
            onBack={goToCategories}
            onContinue={handleItems}
            onAddItem={() =>
              setShowItemSheet(true)
            }
          />
        )}

        {step === 3 && (
          <DetailsStep
            trip={trip}
            category={selectedCategory}
            selectedItems={selectedItems}
            expense={expense}
            onBack={() => setStep(2)}
            onClose={onClose}
            onSaved={onExpenseSaved}
          />
        )}
      </BottomSheet>

      <AddCategorySheet
        isOpen={showCategorySheet}
        onClose={() =>
          setShowCategorySheet(false)
        }
        category={null}
        trip={trip}
        userId={trip?.userId}
        onSaved={handleCategoryCreated}
      />

      <AddItemSheet
        isOpen={showItemSheet}
        onClose={() =>
          setShowItemSheet(false)
        }
        category={selectedCategory}
        item={null}
        onSaved={handleItemCreated}
      />
    </>
  );
}

export default AddExpenseSheet;
