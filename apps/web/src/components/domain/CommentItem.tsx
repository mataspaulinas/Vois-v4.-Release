import { Avatar } from "../ui";

type CommentItemProps = {
  author: string;
  content: string;
  timestamp: string;
};

export function CommentItem({ author, content, timestamp }: CommentItemProps) {
  return (
    <div className="comment-item">
      <Avatar name={author} size="sm" />
      <div className="comment-item__body">
        <div className="comment-item__header">
          <span className="comment-item__author">{author}</span>
          <span className="comment-item__timestamp">{timestamp}</span>
        </div>
        <p className="comment-item__content">{content}</p>
      </div>
    </div>
  );
}
