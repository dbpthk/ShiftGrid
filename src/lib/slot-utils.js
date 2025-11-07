const DAY_SEGMENT_DEFAULT = {
  start: null,
  end: null,
  end_is_closing: false,
};

export function normalizeSegments(rawSegments) {
  const segments = Array.isArray(rawSegments) ? rawSegments : [];
  if (!segments.length) {
    return [
      {
        ...DAY_SEGMENT_DEFAULT,
      },
    ];
  }
  return segments.map((seg = {}) => ({
    start: seg.start ?? null,
    end: seg.end ?? null,
    end_is_closing: Boolean(seg.end_is_closing),
  }));
}

export function withSegments(slot) {
  const segments = normalizeSegments(slot?.segments ?? [slot]);
  const [first] = segments;
  return {
    ...slot,
    start: first?.start ?? null,
    end: first?.end ?? null,
    end_is_closing: Boolean(first?.end_is_closing),
    segments,
  };
}

export function ensureSlotsArray(slots) {
  return Array.isArray(slots) ? slots.map(withSegments) : [];
}

export function updateSlotSegments(slots, slotIndex, segmentIndex, updater) {
  const nextSlots = ensureSlotsArray(slots);
  while (nextSlots.length <= slotIndex) {
    nextSlots.push(withSegments({ segments: [DAY_SEGMENT_DEFAULT] }));
  }
  const slot = withSegments(nextSlots[slotIndex] || {});
  const segments = Array.isArray(slot.segments) ? [...slot.segments] : [];
  while (segments.length <= segmentIndex) {
    segments.push({ ...DAY_SEGMENT_DEFAULT });
  }
  segments[segmentIndex] = updater({ ...segments[segmentIndex] });
  nextSlots[slotIndex] = withSegments({ ...slot, segments });
  return nextSlots;
}

export function addSegment(slots, slotIndex) {
  const nextSlots = ensureSlotsArray(slots);
  while (nextSlots.length <= slotIndex) {
    nextSlots.push(withSegments({ segments: [DAY_SEGMENT_DEFAULT] }));
  }
  const slot = withSegments(nextSlots[slotIndex] || {});
  const segments = Array.isArray(slot.segments) ? [...slot.segments] : [];
  segments.push({ ...DAY_SEGMENT_DEFAULT });
  nextSlots[slotIndex] = withSegments({ ...slot, segments });
  return nextSlots;
}

export function removeSegment(slots, slotIndex, segmentIndex) {
  const nextSlots = ensureSlotsArray(slots);
  if (!nextSlots[slotIndex]) return nextSlots;
  const slot = withSegments(nextSlots[slotIndex]);
  const segments = Array.isArray(slot.segments) ? [...slot.segments] : [];
  if (segments.length <= 1) return nextSlots;
  segments.splice(segmentIndex, 1);
  nextSlots[slotIndex] = withSegments({ ...slot, segments });
  return nextSlots;
}

export function formatSegmentsForDisplay(slot, closingTime) {
  const segments = withSegments(slot).segments;
  return segments
    .map((seg) => {
      const start = seg.start ? String(seg.start).slice(0, 5) : "--";
      let endLabel = "--";
      if (seg.end_is_closing) {
        endLabel = closingTime ? String(closingTime).slice(0, 5) : "closing";
      } else if (seg.end) {
        endLabel = String(seg.end).slice(0, 5);
      }
      return `${start} - ${endLabel}`;
    })
    .join(" / ");
}

export function slotSegmentsDurationMinutes(slot, closingTime, parseTimeToMins) {
  const segments = withSegments(slot).segments;
  if (!segments.length) return 0;
  return segments.reduce((total, seg) => {
    if (!seg.start) return total;
    const start = parseTimeToMins(seg.start);
    if (start == null) return total;
    let endMinutes;
    if (seg.end_is_closing) {
      if (!closingTime) return total;
      endMinutes = parseTimeToMins(closingTime);
    } else {
      endMinutes = parseTimeToMins(seg.end);
    }
    if (endMinutes == null) return total;
    let diff = endMinutes - start;
    if (diff < 0) diff += 24 * 60;
    return total + diff;
  }, 0);
}

