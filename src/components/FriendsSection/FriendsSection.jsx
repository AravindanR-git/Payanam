import { useState } from "react";
import { Plus, Pencil, Trash2, User } from "lucide-react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";
import Input from "../Input/Input";
import Card from "../Card/Card";

import "./FriendsSection.css";
import useLanguage from "../../i18n/useLanguage";

function FriendsSection({
  members,
  setMembers,
  defaultContributionPerPerson,
}) {
  const { t } = useLanguage();
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
      alert(t("enterMemberName"));
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
    if (!window.confirm(t("deleteMember"))) return;

    setMembers((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <>
      <div className="friends-header">

        <div>
          <h2>{t("members")}</h2>
          <p>{members.length} {t("memberCount")}</p>
        </div>

        <Button
          size="sm"
          onClick={openAdd}
        >
          <Plus size={16} />
          &nbsp; {t("addMember")}
        </Button>

      </div>

      {members.length === 0 && (
        <Card>

          <div className="friends-empty">

            <User size={42} />

            <h3>{t("noMembersAdded")}</h3>

            <p>
              {t("tapAddToIncludeFirstTraveller")}
            </p>

          </div>

        </Card>
      )}

      {members.map((member) => (

        <Card
          key={member.id}
          className="friend-card"
        >

          <div className="friend-left">

            <div className="avatar">

              {member.name.charAt(0).toUpperCase()}

            </div>

            <div>

              <h4>{member.name}</h4>

              <span>
                ₹
                {Number(
                  member.contribution
                ).toLocaleString("en-IN")}
              </span>

            </div>

          </div>

          <div className="friend-actions">

            <button
              className="icon-btn"
              onClick={() =>
                openEdit(member)
              }
            >
              <Pencil size={18} />
            </button>

            <button
              className="icon-btn delete"
              onClick={() =>
                deleteMember(member.id)
              }
            >
              <Trash2 size={18} />
            </button>

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
            ? t("editMember")
            : t("addMember")
        }
      >

        <Input
          label={t("memberName")}
          value={form.name}
          placeholder={t("enterMemberName")}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        />

        <Input
          label={t("contribution")}
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
          onClick={saveMember}
        >
          {editingId
            ? t("updateMember")
            : t("saveMember")}
        </Button>

      </BottomSheet>
    </>
  );
}

export default FriendsSection;
