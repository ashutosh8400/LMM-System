import { inputClass } from './Field.jsx';

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      className={inputClass()}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
    />
  );
}
