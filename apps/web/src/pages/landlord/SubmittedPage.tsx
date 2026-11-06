import { Link, useParams } from 'react-router-dom';
import { buttonClass } from '../../components/Button';
import { SuccessState } from '../../components/StateBlocks';
import { useListing } from '../../landlord/queries';

export function SubmittedPage() {
  const { id = '' } = useParams();
  const { data } = useListing(id);

  return (
    <main className="page" id="main">
      <h1 className="sr-only">Listing submitted</h1>
      <div className="submitted">
        <SuccessState
          title="Your listing has been submitted for review."
          text={`${data?.values.title ?? 'Your listing'} is now Pending review. An administrator will check it. Students will see it once it is approved. We'll notify you of the result.`}
          actions={
            <>
              <Link className={buttonClass()} to="/landlord/properties">
                View my properties
              </Link>
              <Link className={buttonClass({ variant: 'secondary' })} to="/landlord/properties/new">
                Add another
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
