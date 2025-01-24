import { Chat } from '@/components/Chat';
import { Toaster } from 'react-hot-toast';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
        <div className="flex justify-center py-4">
          <Image
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTD7nNS9E-xnuivkZiZiIMB9KUyih4wOu4ng&s"
            alt="Chat Logo"
            width={96}
            height={96}
            className="rounded-full"
          />
        </div>
        <Chat />
        <Toaster position="bottom-right" />
      </div>
    </main>
  );
}
