document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to avoid HTML injection when inserting names
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML (include data-email and a delete button)
        let participantsHtml = "";
        if (details.participants && details.participants.length > 0) {
          participantsHtml =
            '<ul class="participants-list">' +
            details.participants
              .map((p) =>
                `<li class="participant-item" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(
                  name
                )}"><span class="participant-name">${escapeHtml(p)}</span><button class="delete-btn" aria-label="Unregister participant" title="Unregister">&times;</button></li>`
              )
              .join("") +
            "</ul>";
        } else {
          participantsHtml =
            '<ul class="participants-list"><li class="participant-item empty">No participants yet</li></ul>';
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly-registered participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegated click handler for unregister/delete buttons inside the activities list
  activitiesList.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".delete-btn");
    if (!btn) return;

    const li = btn.closest(".participant-item");
    if (!li) return;

    const email = li.dataset.email;
    const activity = li.dataset.activity;
    if (!email || !activity) return;

    const confirmed = window.confirm(`Unregister ${email} from ${activity}?`);
    if (!confirmed) return;

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        alert(data.detail || data.error || "Failed to unregister participant");
        return;
      }

      // Refresh activities list so counts and participants update consistently
      await fetchActivities();
    } catch (err) {
      console.error("Unregister error:", err);
      alert("Network error while trying to unregister participant");
    }
  });

  // Initialize app
  fetchActivities();
});
