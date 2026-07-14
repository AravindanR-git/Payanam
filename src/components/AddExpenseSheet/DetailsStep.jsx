import { useEffect, useState } from "react";
import Button from "../Button/Button";

import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";

function DetailsStep({
  trip,
  category,
  item,
  expense = null,
  onBack,
  onClose,
  onSaved,
}) {

  const [amount, setAmount] = useState(
    expense?.amount || ""
  );

  const [notes, setNotes] = useState(
    expense?.notes || ""
  );

  const [participants, setParticipants] = useState([]);

  const [paymentSource, setPaymentSource] = useState(
    expense?.paymentSource || "fund"
  );

  const [paidByParticipantId, setPaidByParticipantId] =
    useState(
      expense?.paidByParticipantId || ""
    );

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {

    const list =
      await ParticipantRepository.getParticipantsByTrip(
        trip.id
      );

    setParticipants(list);

    if (!expense && list.length > 0) {
      setPaidByParticipantId(list[0].id);
    }

  };

  const saveExpense = async () => {

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const expenseData = {

      amount: Number(amount),

      notes,

      paymentSource,

      paidByParticipantId:
        paymentSource === "participant"
          ? paidByParticipantId
          : null,

    };

    if (expense) {

      await ExpenseRepository.updateExpense(
        expense.id,
        expenseData
      );

    } else {

      await ExpenseRepository.createExpense({

        tripId: trip.id,

        categoryId: category.id,
        categoryName: category.name,

        itemId: item.id,
        itemName: item.name,

        expenseTime: new Date().toISOString(),

        ...expenseData,

      });

    }

    if (onSaved) {
      await onSaved();
    }

    onClose();

  };

  const deleteExpense = async () => {

    if (!expense) return;

    const ok = window.confirm(
      "Delete this expense?"
    );

    if (!ok) return;

    await ExpenseRepository.deleteExpense(
      expense.id
    );

    if (onSaved) {
      await onSaved();
    }

    onClose();

  };

  return (

    <div>

      <button
        type="button"
        className="back-step-btn"
        onClick={onBack}
      >
        ← Back
      </button>

      <h3>{item?.name}</h3>

      <input
        className="sheet-input"
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) =>
          setAmount(e.target.value)
        }
      />

      <textarea
        className="sheet-input"
        placeholder="Description (Optional)"
        value={notes}
        onChange={(e) =>
          setNotes(e.target.value)
        }
      />

      <div className="payment-card">

        <h4>Money Source</h4>

        <div
          className="payment-source"
          onClick={() =>
            setPaymentSource(
              paymentSource === "fund"
                ? "participant"
                : "fund"
            )
          }
        >

          {
            paymentSource === "fund"
              ? "💰 Trip Fund"
              : "👤 Personal Wallet"
          }

        </div>

        {

          paymentSource === "participant" && (

            <select
              className="sheet-input"
              value={paidByParticipantId}
              onChange={(e) =>
                setPaidByParticipantId(
                  e.target.value
                )
              }
            >

              {

                participants.map((participant) => (

                  <option
                    key={participant.id}
                    value={participant.id}
                  >
                    {participant.name}
                  </option>

                ))

              }

            </select>

          )

        }

      </div>

      <Button onClick={saveExpense}>

        {

          expense
            ? "Update Expense"
            : "Save Expense"

        }

      </Button>

      {

        expense && (

          <Button
    variant="danger"
    onClick={deleteExpense}
>
    Delete Expense
</Button>

        )

      }

    </div>

  );

}

export default DetailsStep;