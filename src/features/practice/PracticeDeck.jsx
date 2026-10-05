export default function PracticeDeck({ practice }) {
  if (!practice.segmentHint || (practice.pointA == null && practice.pointB == null)) return null;
  return <p className="segment-note">{practice.segmentHint}</p>;
}
