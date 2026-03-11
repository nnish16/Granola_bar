CREATE INDEX IF NOT EXISTS idx_meetings_title_search
  ON meetings(title COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_attendees_meeting_name_search
  ON attendees(meeting_id, name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_attendees_meeting_email_search
  ON attendees(meeting_id, email COLLATE NOCASE);
