import { useState } from "react";
import { HiDownload } from "react-icons/hi";
import "./DownloadButton.css";

export default function DownloadButton() {
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const options = [1, 5, 10, 20, 25];

  const onToggle = () => {
    setIsOpen((prevState) => !prevState);
  };

  const onSelect = (quantity: number) => {
    setSelectedQuantity(quantity);
    setIsOpen(false);
  };

  return (
    <div className="dropdown-container">
      <button className={`download ${isOpen ? "open" : ""}`} onClick={onToggle}>
        <HiDownload className="download-icon" />
        Download
      </button>

      {isOpen && (
        <ul className="dropdown-list">
          {options.map((quantity) => (
            <li key={quantity} className="dropdown-item">
              <button
                className="dropdown-option"
                onClick={() => onSelect(quantity)}>
                {quantity}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}