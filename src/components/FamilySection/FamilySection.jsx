import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";
import Card from "../Card/Card";
import Input from "../Input/Input";
import Stepper from "../Stepper/Stepper";

import "./FamilySection.css";

function FamilySection({
  families,
  setFamilies,
  defaultContributionPerPerson,
  groupLabel = "Family",
  groupLabelPlural = "Families",
  nameLabel = "Family Name",
  namePlaceholder = "Murugan Family",
  defaultAdults = 2,
}) {
  const emptyForm = {
    familyName: "",
    adults: defaultAdults,
    children: 0,
    contribution:
      defaultContributionPerPerson * defaultAdults,
  };

  const [showSheet, setShowSheet] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setEditingId(null);

    setForm({
      familyName: "",
      adults: defaultAdults,
      children: 0,
      contribution:
        defaultContributionPerPerson * defaultAdults,
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
      alert(`Please enter ${nameLabel.toLowerCase()}.`);
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
    if (!window.confirm("Delete this family?"))
      return;

    setFamilies((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <>
      <div className="family-header">
        <div>
          <h2>{groupLabelPlural}</h2>
          <p>{families.length} {groupLabel}(s)</p>
        </div>

        <Button
          size="sm"
          onClick={openAdd}
        >
          <Plus size={16} />
          &nbsp; Add
        </Button>
      </div>

      {families.length === 0 && (
        <Card>
          <div className="family-empty">
            <Users size={42} />

            <h3>No {groupLabelPlural} Added</h3>

            <p>
              Tap <strong>Add</strong> to
              include your first {groupLabel.toLowerCase()}.
            </p>
          </div>
        </Card>
      )}

      {families.map((family) => (
        <Card
          key={family.id}
          className="family-card"
        >
          <div className="family-left">
            <div className="family-avatar">
              {family.familyName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>

              <h4>{family.familyName}</h4>

              <div className="family-meta">

                <span>
                  👨 {family.adults}
                </span>

                <span>
                  🧒 {family.children}
                </span>

              </div>

            </div>
          </div>

          <div className="family-right">

            <strong>
              ₹
              {Number(
                family.contribution
              ).toLocaleString("en-IN")}
            </strong>

            <div className="family-actions">

              <button
                className="icon-btn"
                onClick={() =>
                  openEdit(family)
                }
              >
                <Pencil size={18} />
              </button>

              <button
                className="icon-btn delete"
                onClick={() =>
                  deleteFamily(family.id)
                }
              >
                <Trash2 size={18} />
              </button>

            </div>

          </div>
        </Card>
      ))}

      <BottomSheet
        isOpen={showSheet}
        onClose={() =>
          setShowSheet(false)
        }
        title={
          editingId
            ? `Edit ${groupLabel}`
            : `Add ${groupLabel}`
        }
      >
        <Input
          label={nameLabel}
          value={form.familyName}
          placeholder={namePlaceholder}
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
                (value +
                  prev.children) *
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
                (prev.adults +
                  value) *
                defaultContributionPerPerson,
            }))
          }
        />

        <Input
          label="Contribution"
          type="number"
          value={form.contribution}
          onChange={(e) =>
            setForm({
              ...form,
              contribution: Number(
                e.target.value
              ),
            })
          }
        />

        <Button
          fullWidth
          onClick={saveFamily}
        >
          {editingId
            ? "Update Family"
            : "Save Family"}
        </Button>
      </BottomSheet>
    </>
  );
}

export default FamilySection;
