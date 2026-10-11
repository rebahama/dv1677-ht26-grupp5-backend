export function getAvailableTimes(bookings, dayStart, dayEnd) {
    const sortedBookings = [...bookings].sort(
        (a, b) => new Date(a.startsAt) - new Date(b.startsAt)
    );

    const availableTimes = [];
    let current = new Date(dayStart);
    const endOfDay = new Date(dayEnd);

    for (const booking of sortedBookings) {
        const bookingStart = new Date(booking.startsAt);
        const bookingEnd = new Date(booking.endsAt);

        if (bookingStart > current) {
            availableTimes.push({
                startsAt: current,
                endsAt: bookingStart,
            });
        }

        if (bookingEnd > current) {
            current = bookingEnd;
        }
    }

    if (current < endOfDay) {
        availableTimes.push({
            startsAt: current,
            endsAt: endOfDay,
        });
    }

    return availableTimes;
}