interface PropertyIntroductionProps {
  title: string;
  introductionText: string;
}

const PropertyIntroduction = ({ title: _title, introductionText }: PropertyIntroductionProps) => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Discover Your Retreat</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {introductionText}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PropertyIntroduction;