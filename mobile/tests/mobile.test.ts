import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canStartVideoCall,
  filterAndSearchCalls,
  formatCallDuration,
} from "../src/services/callFilter.js";
import { CallRecord } from "../src/types/index.js";

const SAMPLE_CALLS: CallRecord[] = [
  {
    id: 1,
    ownerId: 1,
    phone: "+919876501234",
    type: "outgoing",
    status: "ended",
    date: "2026-11-14T10:00:00Z",
    duration: 125,
    contactId: 10,
    userId: 2,
    translationUsed: true,
    contactName: "Maya Sharma",
  },
  {
    id: 2,
    ownerId: 1,
    phone: "+919123456789",
    type: "incoming",
    status: "missed",
    date: "2026-11-14T09:15:00Z",
    duration: 0,
    contactId: 11,
    userId: 3,
    translationUsed: true,
    contactName: "Dr. Singh",
  },
];

describe("VAKHYA Mobile Client Unit Tests", () => {
  it("filters call history by category (all, incoming, outgoing, missed) and search query", () => {
    assert.equal(filterAndSearchCalls(SAMPLE_CALLS, "all", "").length, 2);
    assert.equal(filterAndSearchCalls(SAMPLE_CALLS, "outgoing", "").length, 1);
    assert.equal(filterAndSearchCalls(SAMPLE_CALLS, "incoming", "").length, 1);
    assert.equal(filterAndSearchCalls(SAMPLE_CALLS, "missed", "").length, 1);
    assert.equal(filterAndSearchCalls(SAMPLE_CALLS, "all", "Maya")[0].id, 1);
    assert.equal(filterAndSearchCalls(SAMPLE_CALLS, "missed", "Singh")[0].id, 2);
  });

  it("formats call duration cleanly as MM:SS", () => {
    assert.equal(formatCallDuration(0), "00:00");
    assert.equal(formatCallDuration(65), "01:05");
    assert.equal(formatCallDuration(185), "03:05");
  });

  it("enforces camera permission, microphone permission, and explicit consent before starting any call", () => {
    assert.equal(
      canStartVideoCall({ cameraGranted: false, microphoneGranted: true, consentAccepted: true }).allowed,
      false
    );
    assert.equal(
      canStartVideoCall({ cameraGranted: true, microphoneGranted: false, consentAccepted: true }).allowed,
      false
    );
    assert.equal(
      canStartVideoCall({ cameraGranted: true, microphoneGranted: true, consentAccepted: false }).allowed,
      false
    );
    assert.equal(
      canStartVideoCall({ cameraGranted: true, microphoneGranted: true, consentAccepted: true }).allowed,
      true
    );
  });
});
