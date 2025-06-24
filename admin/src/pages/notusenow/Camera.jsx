import { GrTest } from "react-icons/gr";
import PlusButton from "../../components/PlusButton";

function Camera() {
  return (
    <div className="m-5">
      <h1 className="text-2xl font-semibold mb-4">Test Page</h1>
      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-bold mb-4">This is a test page</h2>
        <p className="mb-2">
          <strong>Icon:</strong> <GrTest size={24} />
        </p>
        <p className="mb-2">
          You can add any content here for testing purposes.
        </p>
        <PlusButton text="Click Me!" />
      </div>
    </div>
  );
}

export default Camera;
