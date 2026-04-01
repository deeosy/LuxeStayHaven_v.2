// Initialize hotel details search

async function searchHotelRate() {
    document.getElementById("loader").style.display = "block";

    // Clear previous hotel elements
    const hotelsDiv = document.getElementById("hotels");
    hotelsDiv.innerHTML = "";

    console.log("Searching for hotels...");
    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;
    const adults = document.getElementById("adults").value;
    const hotelId = document.getElementById("hotelId").value;
    const environment = document.getElementById("environment").value;

    console.log("Checkin:", checkin, "Checkout:", checkout, "Adults", adults, "hotelId", hotelId);

    try {
        const response = await fetch(
            `http://localhost:3000/search-rates?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${encodeURIComponent(adults)}&hotelId=${encodeURIComponent(hotelId)}&environment=${encodeURIComponent(environment)}`
        );
        const data = await response.json();

        if (!response.ok) {
            hotelsDiv.innerHTML = `<p class="red" role="alert">${data.error || `Request failed (${response.status})`}</p>`;
            console.error("search-rates error:", response.status, data);
            return;
        }

        displayHotelDetails(data.hotelInfo);
        displayRates(data.rateInfo);
    } catch (error) {
        console.error("Error fetching hotels:", error);
        hotelsDiv.innerHTML = '<p class="red">Network error. Is the server running on port 3000?</p>';
    } finally {
        document.getElementById("loader").style.display = "none";
        const errorMessageDiv = document.getElementById("errorMessage");
        if (errorMessageDiv) errorMessageDiv.style.display = "none";
    }
}

function displayHotelDetails(hotelInfo) {
    const hotelsDiv = document.getElementById("hotels");
    // Ensure to use hotelInfo for accessing hotel properties
    const mainImage = hotelInfo.hotelImages.find(image => image.defaultImage === true)?.url || hotelInfo.hotelImages?.[0]?.url || 'defaultImageUrl';
    // Determine the correct facilities array and take the first 10 items
    const facilitiesArray = hotelInfo.facilities || hotelInfo.hotelFacilities;
    const facilitiesList = facilitiesArray.slice(0, 10).map(facility =>
        typeof facility === 'object' ? facility.name : facility // Check if facility is an object or just a string
    ).join(', ');

    const hotelElement = document.createElement("div");
    hotelElement.innerHTML = `
      <div class='card-container'>
        <div class='card'>
          <div class='flex items-start'>
            <div class='card-image'>
              <img src='${mainImage}' alt='hotel'>
            </div>
            <div class='flex-between-end w-full'>
              <div>
                <h4 class='card-title'>${hotelInfo.name}</h4>
                <h3 class='card-id'>Hotel Address: ${hotelInfo.address}</h3>
                <p class='features'>
                  ${hotelInfo.hotelDescription}
                </p>
                <p class='facilities'>
                   Facilities: ${facilitiesList}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    hotelsDiv.appendChild(hotelElement);
}

function displayRates(rateInfo) {
    const container = document.getElementById('rates'); // Correcting the comment to match the ID used
    container.innerHTML = ''; // Clear previous content

    rateInfo.forEach(roomTypeRates => {
        roomTypeRates.forEach(rate => {
            const rateDiv = document.createElement('div');
            rateDiv.className = 'rate-card'; // Changed class for CSS styling

            const rateName = document.createElement('h4');
            rateName.textContent = `Rate Name: ${rate.rateName}`;
            rateDiv.appendChild(rateName);

            const board = document.createElement('p');
            board.textContent = `Board: ${rate.board}`;
            rateDiv.appendChild(board);

            const refundableTag = document.createElement('p');
            refundableTag.textContent = `Refundable: ${rate.refundableTag}`;
            rateDiv.appendChild(refundableTag);

            const originalRate = document.createElement('p');
            originalRate.textContent = `Public Rate: $${rate.originalRate}`;
            originalRate.style.textDecoration = "line-through";  // Apply strikethrough styling
            rateDiv.appendChild(originalRate);

            const retailRate = document.createElement('p');
            retailRate.textContent = `Promotional rate: $${rate.retailRate}`;
            rateDiv.appendChild(retailRate);

            const bookButton = document.createElement('button');
            bookButton.textContent = 'Book Now';
            bookButton.onclick = function () {
                proceedToBooking(rate.offerId);
            };
            rateDiv.appendChild(bookButton);

            container.appendChild(rateDiv);
        });
    });
}

// You would call this function with the rateInfo data when appropriate, for example after fetching the data.

async function proceedToBooking(rateId) {
    console.log("Proceeding to booking for hotel ID:", rateId);

    // Clear existing HTML and display the loader
    const hotelsDiv = document.getElementById("hotels");
    const ratesDiv = document.getElementById("rates");
    const loader = document.getElementById("loader");
    hotelsDiv.innerHTML = "";
    ratesDiv.innerHTML = "";
    loader.style.display = "block";

    // Create and append the form dynamically
    const formHtml = `
        <form id="bookingForm">
            <input type="hidden" name="prebookId" value="${rateId}">
            <label>Guest First Name:</label>
            <input type="text" name="guestFirstName" required><br>
            <label>Guest Last Name:</label>
            <input type="text" name="guestLastName" required><br>
            <label>Guest Email:</label>
            <input type="email" name="guestEmail" required><br><br>
            <label>Credit Card Holder Name:</label>
            <input type="text" name="holderName" required><br>
			<label>Voucher Code:</label>
            <input type="text" name="voucher"><br>
            <input type="submit" value="Book Now">
        </form>
    `;
    hotelsDiv.innerHTML = formHtml; // Insert the form into the 'hotels' div
    loader.style.display = "none";

    // Add event listener to handle form submission
    document.getElementById("bookingForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        loader.style.display = "block";

        const formData = new FormData(event.target);
        const guestFirstName = formData.get('guestFirstName');
        const guestLastName = formData.get('guestLastName');
        const guestEmail = formData.get('guestEmail');
        const holderName = formData.get('holderName');
        const voucher = formData.get('voucher');
        const environment = document.getElementById("environment").value;

        try {
            // Include additional guest details in the payment processing request

            const bodyData = {
                environment,
                rateId
            };

            // Add voucher if it exists
            if (voucher) {
                bodyData.voucherCode = voucher;
            }

            const prebookResponse = await fetch(`http://localhost:3000/prebook`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(bodyData),
            });

            const prebookData = await prebookResponse.json();

            if (!prebookResponse.ok) {
                const msg =
                    prebookData.error ||
                    prebookData.details?.message ||
                    `Prebook failed (${prebookResponse.status})`;
                hotelsDiv.innerHTML = `<p class="red" role="alert">${msg}</p>`;
                console.error("prebook error:", prebookResponse.status, prebookData);
                return;
            }

            const sdkPayload = prebookData.success;
            const d = sdkPayload?.data;
            if (!sdkPayload || sdkPayload.status !== "success" || !d) {
                hotelsDiv.innerHTML =
                    '<p class="red" role="alert">Invalid prebook response. Try searching again.</p>';
                console.error("prebook unexpected shape:", prebookData);
                return;
            }

            console.log("prebook success", d);

            const paymentData = {
                currency: d.currency || "USD",
                price: d.price,
                voucherTotalAmount: d.voucherTotalAmount,
            };
            displayPaymentInfo(paymentData);

            if (!d.secretKey || !d.prebookId || !d.transactionId) {
                hotelsDiv.innerHTML =
                    '<p class="red" role="alert">Payment session fields missing. Ensure usePaymentSdk is enabled server-side.</p>';
                return;
            }

            initializePaymentForm(
                d.secretKey,
                d.prebookId,
                d.transactionId,
                guestFirstName,
                guestLastName,
                guestEmail
            );
        } catch (error) {
            console.error("Error in payment processing or booking:", error);
            hotelsDiv.innerHTML = `<p class="red" role="alert">${error.message || "Booking request failed"}</p>`;
        } finally {
            loader.style.display = "none";
        }
    });
}

function displayPaymentInfo(data) {
	console.log("displaty payment data function called)")
	const paymentDiv = document.getElementById('hotels');
	if (!paymentDiv) {
		console.error('paymentInfo div not found');
		return;
	}
	// Destructure the necessary data from the object
	const { price, currency, voucherTotalAmount } = data;

	// Create content for the div
	let content = `<p>Total Amount: ${Math.round(price)} USD</p>`;

	// Check if voucherTotalAmount is available and add it to the content
	if (voucherTotalAmount && voucherTotalAmount > 0) {
		content += `<p>Voucher Total Amount: ${Math.round(voucherTotalAmount)} USD</p>`;
	}

	// Update the div's content
	paymentDiv.innerHTML = content;
}