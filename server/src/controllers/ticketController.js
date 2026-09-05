import TicketService from '../services/ticketService.js';

export const holdSeat = async (req, res, next) => {
  try {
    const { eventId, seatId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId in request body',
      });
    }

    const updatedSeat = await TicketService.holdSeat(eventId, seatId, userId);

    res.status(200).json({
      success: true,
      message: `Seat ${updatedSeat.seatNumber} successfully held for checkout.`,
      data: updatedSeat,
    });
  } catch (err) {
    next(err);
  }
};

export const confirmBooking = async (req, res, next) => {
  try {
    const { eventId, seatId } = req.params;
    const { userId } = req.body;
    const idempotencyKey = req.idempotencyKey || req.headers['idempotency-key'] || req.body.idempotencyKey;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId in request body',
      });
    }

    const { order, replayed } = await TicketService.confirmBooking(
      eventId,
      seatId,
      userId,
      idempotencyKey
    );

    res.status(replayed ? 200 : 201).json({
      success: true,
      replayed,
      message: replayed
        ? 'Order already processed (idempotent cached replay).'
        : 'Seat booked and order confirmed successfully.',
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const releaseHold = async (req, res, next) => {
  try {
    const { eventId, seatId } = req.params;
    const { userId } = req.body;

    const released = await TicketService.releaseHold(eventId, seatId, userId);

    res.status(200).json({
      success: true,
      released,
      message: released ? 'Seat hold released successfully.' : 'Seat was not held or already expired.',
    });
  } catch (err) {
    next(err);
  }
};
