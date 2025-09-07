-- Function to delete a message and update its replies
CREATE OR REPLACE FUNCTION delete_message_and_update_replies(message_id BIGINT)
RETURNS VOID AS $$
BEGIN
  -- Start a transaction
  BEGIN
    -- Update all messages that were replies to this message
    UPDATE messages
    SET reply_to = NULL
    WHERE reply_to = message_id;

    -- Delete the message
    DELETE FROM messages
    WHERE id = message_id;

    -- If we get here, commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- If we catch an error, roll back the transaction
      ROLLBACK;
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;
