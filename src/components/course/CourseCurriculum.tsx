import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Video, FileText, CheckCircle, Clock, Download, Play, Lock
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number;
}

interface CourseMaterial {
  id: string;
  title: string;
  material_type: string;
  video_url: string | null;
  pdf_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

interface CourseCurriculumProps {
  lessons: Lesson[];
  materials: CourseMaterial[];
  selectedItem: Lesson | CourseMaterial | null;
  completedLessons: Set<string>;
  isEnrolled: boolean;
  onSelectItem: (item: Lesson | CourseMaterial) => void;
  onMarkComplete: (id: string) => void;
  getYouTubeEmbedUrl: (url: string) => string | null;
}

export function CourseCurriculum({
  lessons,
  materials,
  selectedItem,
  completedLessons,
  isEnrolled,
  onSelectItem,
  onMarkComplete,
  getYouTubeEmbedUrl,
}: CourseCurriculumProps) {
  const totalItems = lessons.length + materials.length;
  const completedCount = [...lessons, ...materials].filter(item => completedLessons.has(item.id)).length;

  const hasVideo = (item: Lesson | CourseMaterial): boolean => {
    if ('material_type' in item) {
      return item.material_type === 'video';
    }
    return !!item.video_url;
  };

  const getVideoUrl = (item: Lesson | CourseMaterial): string | null => {
    if ('material_type' in item) {
      return item.material_type === 'video' ? item.video_url : null;
    }
    return item.video_url;
  };

  const getPdfUrl = (item: Lesson | CourseMaterial): string | null => {
    if ('material_type' in item) {
      return item.material_type === 'pdf' ? item.pdf_url : null;
    }
    return item.pdf_url;
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Video Player / Content Viewer */}
      <div className="lg:col-span-2 space-y-4">
        {selectedItem ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {hasVideo(selectedItem) ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  {selectedItem.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isEnrolled && !completedLessons.has(selectedItem.id) && (
                    <Button size="sm" onClick={() => onMarkComplete(selectedItem.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </Button>
                  )}
                  {completedLessons.has(selectedItem.id) && (
                    <Badge className="bg-chart-1/10 text-chart-1 border-chart-1/30">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const videoUrl = getVideoUrl(selectedItem);
                if (videoUrl) {
                  const embedUrl = getYouTubeEmbedUrl(videoUrl);
                  return (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full"
                        />
                      )}
                    </div>
                  );
                }
                
                const pdfUrl = getPdfUrl(selectedItem);
                if (pdfUrl) {
                  return (
                    <div className="space-y-4">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                          className="w-full h-full"
                          title={selectedItem.title}
                        />
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </a>
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No content available</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Play className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a lesson to begin</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lesson List */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Course Content</CardTitle>
            <CardDescription>{totalItems} lessons • {completedCount} completed</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Accordion type="multiple" defaultValue={['lessons', 'materials']} className="w-full">
                {lessons.length > 0 && (
                  <AccordionItem value="lessons" className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>Lessons ({lessons.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="space-y-0.5">
                        {lessons.map((lesson, index) => (
                          <button
                            key={lesson.id}
                            onClick={() => onSelectItem(lesson)}
                            disabled={!isEnrolled}
                            className={`w-full p-3 text-left transition-colors flex items-center gap-3 ${
                              selectedItem?.id === lesson.id 
                                ? 'bg-primary/10 border-l-2 border-l-primary' 
                                : 'hover:bg-accent'
                            } ${!isEnrolled ? 'opacity-60' : ''}`}
                          >
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                              completedLessons.has(lesson.id) ? 'bg-chart-1/20 border-chart-1' : ''
                            }`}>
                              {completedLessons.has(lesson.id) ? (
                                <CheckCircle className="h-4 w-4 text-chart-1" />
                              ) : !isEnrolled ? (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span className="text-sm truncate flex-1">{lesson.title}</span>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {materials.length > 0 && (
                  <AccordionItem value="materials" className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Materials ({materials.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="space-y-0.5">
                        {materials.map((material, index) => (
                          <button
                            key={material.id}
                            onClick={() => onSelectItem(material)}
                            disabled={!isEnrolled}
                            className={`w-full p-3 text-left transition-colors flex items-center gap-3 ${
                              selectedItem?.id === material.id 
                                ? 'bg-primary/10 border-l-2 border-l-primary' 
                                : 'hover:bg-accent'
                            } ${!isEnrolled ? 'opacity-60' : ''}`}
                          >
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                              completedLessons.has(material.id) ? 'bg-chart-1/20 border-chart-1' : ''
                            }`}>
                              {completedLessons.has(material.id) ? (
                                <CheckCircle className="h-4 w-4 text-chart-1" />
                              ) : !isEnrolled ? (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm truncate block">{material.title}</span>
                              {material.duration_minutes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {material.duration_minutes} min
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>

              {totalItems === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No content available yet
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
