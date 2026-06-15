import React, { useState } from 'react';
import { Stack, Typography, Button, TextField } from '@mui/material';
import Moment from 'react-moment';
import { resolveImageUrl } from '../../config';
import { Comment } from '../../types/comment/comment';

interface ReviewProps {
  comment: Comment;
  userId: string;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

const Review: React.FC<ReviewProps> = ({
  comment,
  userId,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.commentContent);

  return (
    <Stack className="review-config">
      <Stack direction="row" spacing={1} className="parent-comment">
        <img
          src={resolveImageUrl(comment.memberData?.memberImage, '/img/profile/defaultUser.svg')}
          alt=""
          className="img-box small"
        />
        <Stack className="comment-body">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography className="name">{comment.memberData?.memberNick}</Typography>
            <Typography className="date">
              <Moment format="DD MMM, YYYY HH:mm:ss">{comment.createdAt}</Moment>
            </Typography>
          </Stack>

          {/* Comment Content */}
          {isEditing ? (
            <TextField
              fullWidth
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              size="small"
              multiline
            />
          ) : (
            <Typography className="description">{comment.commentContent}</Typography>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={2} mt={1}>
            {userId === comment.memberId && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => {
                        onEdit(comment._id, editContent);
                        setIsEditing(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button size="small" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="small" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => onDelete(comment._id)}>
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default Review;
