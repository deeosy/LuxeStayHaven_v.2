// Initialize the SDK with your API key
const API_BASE = import.meta.env.DEV 
  ? "http://localhost:5000" 
  : "https://your-render-backend-url.onrender.com";   // we'll set this later for production

async function searchHotels() {
	document.getElementById("loader").style.display = "block";

	// Clear previous hotel elements
	const hotelsDiv = document.getElementById("hotels");
	hotelsDiv.innerHTML = "";

	console.log("Searching for hotels...");
	const checkin = document.getElementById("checkin").value;
	const checkout = document.getElementById("checkout").value;
	const adults = document.getElementById("adults").value;
	const city = document.getElementById("city").value;
	const countryCode = document.getElementById("countryCode").value;
	const environment = document.getElementById("environment").value;

	console.log("Checkin:", checkin, "Checkout:", checkout, "Adults", adults);

	try {
		const response = await fetch(
			`${API_BASE}/search-hotels?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${encodeURIComponent(adults)}&city=${encodeURIComponent(city)}&countryCode=${encodeURIComponent(countryCode)}&environment=${encodeURIComponent(environment)}`
		);
		const body = await response.json();

		if (!response.ok) {
			const msg =
				body.error ||
				`Request failed (${response.status})`;
			hotelsDiv.innerHTML = `<p class="red" role="alert">${msg}</p>`;
			console.error("search-hotels error:", response.status, body);
			return;
		}

		const rates = Array.isArray(body.rates) ? body.rates : [];
		console.log(rates);

		if (rates.length === 0) {
			hotelsDiv.innerHTML = "<p>No hotels or rates returned for this search.</p>";
			return;
		}

		displayRatesAndHotels(rates);
	} catch (error) {
		console.error("Error fetching hotels:", error);
		hotelsDiv.innerHTML = `<p class="red">Network error. Is the server running on port ${API_BASE}?</p>`;
	} finally {
		document.getElementById("loader").style.display = "none";
	}
}

function displayRatesAndHotels(rates) {
	const hotelsDiv = document.getElementById("hotels");

	if (!Array.isArray(rates) || rates.length === 0) {
		hotelsDiv.innerHTML = "<p>No results to display.</p>";
		return;
	}

	rates.forEach((rate) => {
		const minRate = rate.roomTypes.reduce((min, current) => {
			const minAmount = min.rates[0].retailRate.total[0].amount;
			const currentAmount = current.rates[0].retailRate.total[0].amount;
			return minAmount < currentAmount ? min : current;
		});
		console.log();

		const hotelElement = document.createElement("div");
		hotelElement.innerHTML = `
		<div class='card-container'>
		<div class='card'>
			<div class='flex items-start'>
				<div class='card-image'>
					<img
						src='${rate.hotel.main_photo}'
						alt='hotel'
					/>
				</div>
				<div class='flex-between-end w-full'>
					<div>
						<h4 class='card-title'>${minRate.rates[0].name}</h4>
						<h3 class='card-id'>Hotel Name : ${rate.hotel.name}</h3>
						<p class='featues'>
							Max Occupancy ∙ <span>${minRate.rates[0].maxOccupancy}</span> Adult Count
							∙ <span>${minRate.rates[0].adultCount}</span> Child Count ∙
							<span>${minRate.rates[0].childCount}</span>
							Board Type ∙ <span>${minRate.rates[0].boardType}</span> Board Name ∙
							<span> ${minRate.rates[0].boardName}</span>
						</p>
						<p class='red flex items-center'>
							<span>
								${minRate.rates[0].cancellationPolicies.refundableTag == "NRFN"
				? "Non refundable"
				: "Refundable"
			}
							</span>
						</p>
					</div>
					<p class='flex flex-col mb-0'>
    					<span class=${minRate.rates[0].retailRate.total[0].amount}></span>
   						<span class=${minRate.rates[0].retailRate.suggestedSellingPrice[0].amount}></span>
   						<button class='price-btn' onclick="proceedToBooking('${minRate.offerId}')">
       						 <s>${minRate.rates[0].retailRate.suggestedSellingPrice[0].amount} ${minRate.rates[0].retailRate.suggestedSellingPrice[0].currency}</s>
        					BOOK NOW ${minRate.rates[0].retailRate.total[0].amount} ${minRate.rates[0].retailRate.total[0].currency}
    					</button>
					</p>
				</div>
			</div>
		</div>
	</div>
        `;

		hotelsDiv.appendChild(hotelElement);
	});
}

async function proceedToBooking(rateId) {
	console.log("Proceeding to booking for hotel ID:", rateId);

	// Clear existing HTML and display the loader
	const hotelsDiv = document.getElementById("hotels");
	const loader = document.getElementById("loader");
	hotelsDiv.innerHTML = "";
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
			console.log(bodyData);

			const prebookResponse = await fetch(`${API_BASE}/prebook`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
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
	console.log("display payment data function called)")
	const paymentDiv = document.getElementById('hotels');
	if (!paymentDiv) {
		console.error('paymentInfo div not found');
		return;
	}
	// Destructure the necessary data from the object
	const { price, currency, voucherTotalAmount } = data;

	// Create content for the div
	let content = `<p>Amount: ${price} ${currency}</p>`;

	// Check if voucherTotalAmount is available and add it to the content
	if (voucherTotalAmount && voucherTotalAmount > 0) {
		content += `<p>Voucher Total Amount: ${voucherTotalAmount} ${currency}</p>`;
	}

	// Update the div's content
	paymentDiv.innerHTML = content;
}