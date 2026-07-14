import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";
import Stepper from "../Stepper/Stepper";

import "./FamilySection.css";

function FamilySection({
  families,
  setFamilies,
  defaultContributionPerPerson,
}) {
  const emptyForm = {
    familyName: "",
    adults: 2,
    children: 0,
    contribution: defaultContributionPerPerson * 2,
  };

  const [showSheet, setShowSheet] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setEditingId(null);

    setForm({
      familyName: "",
      adults: 2,
      children: 0,
      contribution: defaultContributionPerPerson * 2,
    });

    setShowSheet(true);
  };

  const openEdit = (family) => {
    setEditingId(family.id);
    setForm(family);
    setShowSheet(true);
  };

  const saveFamily = () => {
    if (!form.familyName.trim()) {
      alert("Please enter family name.");
      return;
    }

    if (editingId) {
      setFamilies((prev) =>
        prev.map((item) =>
          item.id === editingId ? form : item
        )
      );
    } else {
      setFamilies((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...form,
        },
      ]);
    }

    setShowSheet(false);
  };

  const deleteFamily = (id) => {
    if (!window.confirm("Delete this family?")) return;

    setFamilies((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <>

      <div className="section-header">

        <h3>
          Families ({families.length})
        </h3>

      </div>

      {families.length === 0 && (
        <div className="empty-box">
          No families added yet.
        </div>
      )}

      {families.map((family) => (

        <div
          className="family-card"
          key={family.id}
        >

          <div>

            <h4>{family.familyName}</h4>

            <p>
              👨 {family.adults} Adults &nbsp; | &nbsp;
              🧒 {family.children} Children
            </p>

          </div>

          <div className="right-side">

            <strong>
              ₹{family.contribution.toLocaleString("en-IN")}
            </strong>

            <div className="actions">

              <button
                onClick={() => openEdit(family)}
              >
                <Pencil size={18} />
              </button>

              <button
                onClick={() =>
                  deleteFamily(family.id)
                }
              >
                <Trash2 size={18} />
              </button>

            </div>

          </div>

        </div>

      ))}

      <button
        className="add-member-btn"
        onClick={openAdd}
      >
        <Plus size={18} />
        Add Family
      </button>

      <BottomSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        title={
          editingId
            ? "Edit Family"
            : "Add Family"
        }
      >

        <input
          className="sheet-input"
          placeholder="Family Name"
          value={form.familyName}
          onChange={(e) =>
            setForm({
              ...form,
              familyName: e.target.value,
            })
          }
        />

        <Stepper
          label="Adults"
          value={form.adults}
          setValue={(value) =>
            setForm((prev) => ({
              ...prev,
              adults: value,
              contribution:
                (value + prev.children) *
                defaultContributionPerPerson,
            }))
          }
        />

        <Stepper
          label="Children"
          value={form.children}
          setValue={(value) =>
            setForm((prev) => ({
              ...prev,
              children: value,
              contribution:
                (prev.adults + value) *
                defaultContributionPerPerson,
            }))
          }
        />

        <input
          className="sheet-input"
          type="number"
          placeholder="Contribution"
          value={form.contribution}
          onChange={(e) =>
            setForm({
              ...form,
              contribution: Number(e.target.value),
            })
          }
        />

        <Button onClick={saveFamily}>
          {editingId ? "Update" : "Save"}
        </Button>

      </BottomSheet>

    </>
  );
}

export default FamilySection;