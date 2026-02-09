import { PageTitle } from "@/components/PageTitle";

export default function ErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <PageTitle title="Error 404" />
            <h1 className="text-4xl font-bold">Error 404</h1>
            <p className="mt-4 text-lg">Not existing page!</p>
        </div>
    );
}
