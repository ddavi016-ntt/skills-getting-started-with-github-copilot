document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participants-list">
              ${details.participants && details.participants.length > 0
                ? details.participants.map(p => `<li class="participant-item"><span class="participant-email">${p}</span><button class="delete-participant" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(p)}" aria-label="Remove ${p}">✕</button></li>`).join("")
                : `<li class="no-participants">No participants yet</li>`}
            </ul>
          </div>
        `;

        // store encoded activity name and max on the card for later updates
        activityCard.dataset.activity = encodeURIComponent(name);
        activityCard.dataset.max = details.max_participants;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Wire up delete buttons inside this card
        const deleteButtons = activityCard.querySelectorAll('.delete-participant');
        deleteButtons.forEach((btn) => {
          btn.addEventListener('click', async (event) => {
            event.preventDefault();
            const activityName = decodeURIComponent(btn.dataset.activity);
            const email = decodeURIComponent(btn.dataset.email);

            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );

              const result = await resp.json();

              if (resp.ok) {
                // Remove participant from UI
                const li = btn.closest('li');
                if (li) li.remove();

                // Update local details.participants array so availability updates correctly
                const idx = details.participants.findIndex(p => p.trim().toLowerCase() === email.trim().toLowerCase());
                if (idx !== -1) details.participants.splice(idx, 1);

                // Update availability text
                const availabilityP = activityCard.querySelector('.availability');
                if (availabilityP) {
                  const newSpotsLeft = details.max_participants - details.participants.length;
                  availabilityP.innerHTML = `<strong>Availability:</strong> ${newSpotsLeft} spots left`;
                }

                // If no participants left, show placeholder
                const participantsList = activityCard.querySelector('.participants-list');
                if (participantsList && details.participants.length === 0) {
                  participantsList.innerHTML = `<li class="no-participants">No participants yet</li>`;
                }
              } else {
                messageDiv.textContent = result.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            }
          });
        });
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

        // Update the activity card in-place so changes are visible without refresh
        const card = activitiesList.querySelector(`[data-activity="${encodeURIComponent(activity)}"]`);
        if (card) {
          const participantsList = card.querySelector('.participants-list');
          if (participantsList) {
            // remove "no participants" placeholder if present
            const placeholder = participantsList.querySelector('.no-participants');
            if (placeholder) participantsList.innerHTML = '';

            // append new participant item
            const liHtml = `<li class="participant-item"><span class="participant-email">${email}</span><button class="delete-participant" data-activity="${encodeURIComponent(activity)}" data-email="${encodeURIComponent(email)}" aria-label="Remove ${email}">✕</button></li>`;
            participantsList.insertAdjacentHTML('beforeend', liHtml);

            // attach handler to the newly added button
            const newBtn = participantsList.querySelector(`button[data-email="${encodeURIComponent(email)}"]`);
            if (newBtn) {
              newBtn.addEventListener('click', async (ev) => {
                ev.preventDefault();
                const activityName = decodeURIComponent(newBtn.dataset.activity);
                const emailToRemove = decodeURIComponent(newBtn.dataset.email);
                try {
                  const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(emailToRemove)}`, { method: 'DELETE' });
                  const resJson = await resp.json();
                  if (resp.ok) {
                    const li = newBtn.closest('li');
                    if (li) li.remove();

                    // update availability
                    const max = parseInt(card.dataset.max || '0', 10);
                    const count = card.querySelectorAll('.participants-list .participant-item').length;
                    const availabilityP = card.querySelector('.availability');
                    if (availabilityP) availabilityP.innerHTML = `<strong>Availability:</strong> ${max - count} spots left`;

                    // if no participants left, show placeholder
                    const participantsListNow = card.querySelector('.participants-list');
                    if (participantsListNow && participantsListNow.querySelectorAll('.participant-item').length === 0) {
                      participantsListNow.innerHTML = `<li class="no-participants">No participants yet</li>`;
                    }
                  } else {
                    messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                    messageDiv.className = 'error';
                    messageDiv.classList.remove('hidden');
                    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                  }
                } catch (err) {
                  console.error('Error removing participant:', err);
                }
              });
            }

            // update availability after adding
            const max = parseInt(card.dataset.max || '0', 10);
            const count = card.querySelectorAll('.participants-list .participant-item').length;
            const availabilityP = card.querySelector('.availability');
            if (availabilityP) availabilityP.innerHTML = `<strong>Availability:</strong> ${max - count} spots left`;
          }
        }
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

  // Initialize app
  fetchActivities();
});
