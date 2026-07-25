const defaultCategories = [
  {
    id: "transport",
    name: "Transport",
    icon: "Car",
    color: "#2563EB",
    tripTypes: ["all"],
    displayOrder: 1,
    isDefault: true,
  },

  {
    id: "food",
    name: "Food",
    icon: "UtensilsCrossed",
    color: "#F97316",
    tripTypes: ["all"],
    displayOrder: 2,
    isDefault: true,
  },

  {
    id: "stay",
    name: "Accommodation",
    icon: "Hotel",
    color: "#14B8A6",
    tripTypes: ["friends", "family"],
    displayOrder: 3,
    isDefault: true,
  },

  {
    id: "shopping",
    name: "Shopping",
    icon: "ShoppingBag",
    color: "#EC4899",
    tripTypes: ["all"],
    displayOrder: 4,
    isDefault: true,
  },

  {
    id: "medical",
    name: "Medical",
    icon: "Cross",
    color: "#DC2626",
    tripTypes: ["all"],
    displayOrder: 5,
    isDefault: true,
  },

  {
    id: "temple",
    name: "Temple",
    icon: "Landmark",
    color: "#7C3AED",
    tripTypes: ["temple"],
    displayOrder: 6,
    isDefault: true,
  },

  {
    id: "donation",
    name: "Donation",
    icon: "HeartHandshake",
    color: "#EAB308",
    tripTypes: ["temple"],
    displayOrder: 7,
    isDefault: true,
  },

  {
    id: "entertainment",
    name: "Entertainment",
    icon: "PartyPopper",
    color: "#8B5CF6",
    tripTypes: ["friends", "family"],
    displayOrder: 8,
    isDefault: true,
  },

  {
    id: "misc",
    name: "Miscellaneous",
    icon: "Package",
    color: "#6B7280",
    tripTypes: ["all"],
    displayOrder: 9,
    isDefault: true,
  },
];

export default defaultCategories;