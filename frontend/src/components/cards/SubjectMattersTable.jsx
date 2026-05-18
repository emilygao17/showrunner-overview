import TableCard from './TableCard.jsx';

export default function SubjectMattersTable({ stats }) {
  return <TableCard stats={stats} label="Most Popular Subject Matters" firstColHeader="Subject matter" />;
}
