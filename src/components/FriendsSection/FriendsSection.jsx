import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import "./FriendsSection.css";

function FriendsSection({
  members,
  setMembers,
  defaultContributionPerPerson,
}) {
  const emptyForm = {
    name: "",
    contribution: defaultContributionPerPerson,
  };

  const [showSheet, setShowSheet] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      contribution: defaultContributionPerPerson,
    });
    setShowSheet(true);
  };

  const openEdit = (member) => {
    setEditingId(member.id);
    setForm(member);
    setShowSheet(true);
  };

  const saveMember = () => {
    if (!form.name.trim()) {
      alert("Please enter member name");
      return;
    }

    if (editingId) {
      setMembers((prev) =>
        prev.map((item) =>
          item.id === editingId ? form : item
        )
      );
    } else {
      setMembers((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...form,
        },
      ]);
    }

    setShowSheet(false);
  };

  const deleteMember = (id) => {
    if (!window.confirm("Delete this member?")) return;

    setMembers((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <>

      <div className="section-header">

        <h3>
          Members ({members.length})
        </h3>

      </div>

      {members.length === 0 && (
        <div className="empty-box">
          No members added yet.
        </div>
      )}

      {members.map((member) => (
        <div
          className="member-card"
          key={member.id}
        >
          <div>

            <h4>{member.name}</h4>

            <span>
              ₹{member.contribution.toLocaleString("en-IN")}
            </span>

          </div>

          <div className="actions">

            <button
              onClick={() => openEdit(member)}
            >
              <Pencil size={18} />
            </button>

            <button
              onClick={() =>
                deleteMember(member.id)
              }
            >
              <Trash2 size={18} />
            </button>

          </div>

        </div>
      ))}

      <button
        className="add-member-btn"
        onClick={openAdd}
      >
        <Plus size={18} />
        Add Member
      </button>

      <BottomSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        title={
          editingId
            ? "Edit Member"
            : "Add Member"
        }
      >
        <input
          className="sheet-input"
          placeholder="Member Name"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        />

        <input
          className="sheet-input"
          type="number"
          placeholder="Initial Contribution"
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

        <Button onClick={saveMember}>
          {editingId ? "Update" : "Save"}
        </Button>

      </BottomSheet>

    </>
  );
}

export default FriendsSection;