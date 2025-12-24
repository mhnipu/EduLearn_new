import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Video, FileText, CheckCircle, Clock, Download, Play, Lock, BookOpen, Layers, ChevronRight
} from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number | null;
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number;
  module_id: string | null;
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
  modules: Module[];
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
  modules,
  lessons,
  materials,
  selectedItem,
  completedLessons,
  isEnrolled,
  onSelectItem,
  onMarkComplete,
  getYouTubeEmbedUrl,
}: CourseCurriculumProps) {
  // Group lessons by module
  const lessonsByModule = useMemo(() => {
    const grouped: Record<string, Lesson[]> = {};
    const ungrouped: Lesson[] = [];

    lessons.forEach(lesson => {
      if (lesson.module_id) {
        if (!grouped[lesson.module_id]) {
          grouped[lesson.module_id] = [];
        }
        grouped[lesson.module_id].push(lesson);
      } else {
        ungrouped.push(lesson);
      }
    });

    // Sort lessons within each module
    Object.keys(grouped).forEach(moduleId => {
      grouped[moduleId].sort((a, b) => a.order_index - b.order_index);
    });
    ungrouped.sort((a, b) => a.order_index - b.order_index);

    return { grouped, ungrouped };
  }, [lessons]);

  // Calculate totals
  const totalItems = lessons.length + materials.length;
  const completedCount = [...lessons, ...materials].filter(item => completedLessons.has(item.id)).length;
  const progressPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

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

  const getModuleById = (moduleId: string): Module | undefined => {
    return modules.find(m => m.id === moduleId);
  };

  // Sort modules by order_index
  const sortedModules = [...modules].sort((a, b) => {
    const aIndex = a.order_index ?? 999;
    const bIndex = b.order_index ?? 999;
    return aIndex - bIndex;
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Video Player / Content Viewer */}
      <div className="lg:col-span-2 space-y-4">
        {selectedItem ? (
          <Card className={cn(
            "shadow-lg bg-card",
            "hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
          )}>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {hasVideo(selectedItem) ? (
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg text-foreground">{selectedItem.title}</CardTitle>
                    {selectedItem && 'material_type' in selectedItem && selectedItem.duration_minutes && (
                      <CardDescription className="flex items-center gap-1 mt-1 text-orange-700 dark:text-orange-300">
                        <Clock className="h-3 w-3" />
                        {selectedItem.duration_minutes} minutes
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEnrolled && !completedLessons.has(selectedItem.id) && (
                    <Button 
                      size="sm" 
                      onClick={() => onMarkComplete(selectedItem.id)}
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </Button>
                  )}
                  {completedLessons.has(selectedItem.id) && (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                const videoUrl = getVideoUrl(selectedItem);
                if (videoUrl) {
                  const embedUrl = getYouTubeEmbedUrl(videoUrl);
                  return (
                    <div className="space-y-4">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
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
                    </div>
                  );
                }
                
                const pdfUrl = getPdfUrl(selectedItem);
                if (pdfUrl) {
                  return (
                    <div className="space-y-4">
                      <div className="aspect-video bg-orange-50 dark:bg-orange-900/20 rounded-lg overflow-hidden shadow-lg">
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                          className="w-full h-full"
                          title={selectedItem.title}
                        />
                      </div>
                      <Button 
                        asChild 
                        variant="outline" 
                        className="w-full border-0 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:scale-105 hover:shadow-lg transition-all duration-200" 
                        size="lg"
                      >
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </a>
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="aspect-video bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-orange-300/50 dark:border-orange-700/50">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                      <p className="text-orange-700 dark:text-orange-300 font-medium">No content available</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card className={cn(
            "shadow-lg bg-card",
            "hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
          )}>
            <CardContent className="flex flex-col items-center justify-center py-20 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              {!isEnrolled ? (
                <>
                  <div className="p-4 bg-orange-100 dark:bg-orange-900/40 rounded-full mb-4">
                    <Lock className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Enroll to Access Content</h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium text-center max-w-md">
                    Please enroll in this course to view lessons and materials. Once enrolled, you'll have full access to all course content.
                  </p>
                </>
              ) : (
                <>
                  <div className="p-4 bg-orange-100 dark:bg-orange-900/40 rounded-full mb-4">
                    <Play className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Select a Lesson to Begin</h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium text-center max-w-md">
                    Choose a lesson or material from the course content panel to start learning
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Course Content Sidebar */}
      <div className="lg:col-span-1">
        <Card className={cn(
          "sticky top-4 shadow-lg bg-card",
          "hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
        )}>
          <CardHeader className="pb-3 border-b border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-lg text-orange-700 dark:text-orange-300">Course Content</CardTitle>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-600 dark:text-orange-400 font-medium">Progress</span>
                <span className="font-semibold text-orange-700 dark:text-orange-300">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                <div 
                  className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <CardDescription className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                {completedCount} of {totalItems} items completed
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-4">
                {/* Modules with Lessons */}
                {sortedModules.length > 0 && sortedModules.map((module) => {
                  const moduleLessons = lessonsByModule.grouped[module.id] || [];
                  const moduleCompleted = moduleLessons.filter(l => completedLessons.has(l.id)).length;
                  const moduleProgress = moduleLessons.length > 0 
                    ? Math.round((moduleCompleted / moduleLessons.length) * 100) 
                    : 0;

                  return (
                    <Accordion key={module.id} type="single" collapsible className="w-full">
                      <AccordionItem value={module.id} className="border-0">
                        <AccordionTrigger className="px-3 py-2.5 hover:no-underline bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Layers className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium text-sm truncate text-orange-700 dark:text-orange-300">{module.title}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                  {moduleLessons.length} {moduleLessons.length === 1 ? 'lesson' : 'lessons'} • {moduleProgress}% complete
                                </p>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-0">
                          <div className="space-y-0.5 pl-2 border-l-2 border-orange-300 dark:border-orange-700">
                            {moduleLessons.map((lesson, index) => (
                              <button
                                key={lesson.id}
                                onClick={() => {
                                  if (!isEnrolled) return;
                                  onSelectItem(lesson);
                                }}
                                disabled={!isEnrolled}
                                className={cn(
                                  "w-full p-3 text-left transition-all rounded-md flex items-center gap-3",
                                  selectedItem?.id === lesson.id 
                                    ? 'bg-orange-100 dark:bg-orange-900/30 border-l-2 border-l-orange-600 dark:border-l-orange-500 shadow-sm' 
                                    : isEnrolled ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-[1.02] hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
                                )}
                                title={!isEnrolled ? 'Please enroll to access this lesson' : lesson.title}
                              >
                                <div className={cn(
                                  "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                                  completedLessons.has(lesson.id) 
                                    ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400' 
                                    : selectedItem?.id === lesson.id
                                    ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-600 dark:border-orange-500 text-orange-700 dark:text-orange-300'
                                    : 'bg-background border-orange-200/50 dark:border-orange-800/50'
                                )}>
                                  {completedLessons.has(lesson.id) ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : !isEnrolled ? (
                                    <Lock className="h-3 w-3" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-foreground">{lesson.title}</p>
                                  {lesson.video_url && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5 font-medium">
                                      <Video className="h-3 w-3" />
                                      Video
                                    </p>
                                  )}
                                  {lesson.pdf_url && !lesson.video_url && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5 font-medium">
                                      <FileText className="h-3 w-3" />
                                      PDF
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}

                {/* Ungrouped Lessons (no module) */}
                {lessonsByModule.ungrouped.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Video className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Other Lessons</span>
                      </div>
                    <div className="space-y-0.5">
                      {lessonsByModule.ungrouped.map((lesson, index) => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            if (!isEnrolled) return;
                            onSelectItem(lesson);
                          }}
                          disabled={!isEnrolled}
                          className={cn(
                            "w-full p-3 text-left transition-all rounded-md flex items-center gap-3",
                            selectedItem?.id === lesson.id 
                              ? 'bg-orange-100 dark:bg-orange-900/30 border-l-2 border-l-orange-600 dark:border-l-orange-500 shadow-sm' 
                              : isEnrolled ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-[1.02] hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
                          )}
                          title={!isEnrolled ? 'Please enroll to access this lesson' : lesson.title}
                        >
                          <div className={cn(
                            "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                            completedLessons.has(lesson.id) 
                              ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400' 
                              : selectedItem?.id === lesson.id
                              ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-600 dark:border-orange-500 text-orange-700 dark:text-orange-300'
                              : 'bg-background border-orange-200/50 dark:border-orange-800/50'
                          )}>
                            {completedLessons.has(lesson.id) ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : !isEnrolled ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lesson.title}</p>
                            {lesson.video_url && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5 font-medium">
                                <Video className="h-3 w-3" />
                                Video
                              </p>
                            )}
                            {lesson.pdf_url && !lesson.video_url && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5 font-medium">
                                <FileText className="h-3 w-3" />
                                PDF
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials Section */}
                {materials.length > 0 && (
                  <>
                    <Separator className="my-4 bg-orange-200/50 dark:bg-orange-800/50" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Additional Materials</span>
                      </div>
                      <div className="space-y-0.5">
                        {materials.map((material, index) => (
                          <button
                            key={material.id}
                            onClick={() => {
                              if (!isEnrolled) return;
                              onSelectItem(material);
                            }}
                            disabled={!isEnrolled}
                            className={cn(
                              "w-full p-3 text-left transition-all rounded-md flex items-center gap-3",
                              selectedItem?.id === material.id 
                                ? 'bg-orange-100 dark:bg-orange-900/30 border-l-2 border-l-orange-600 dark:border-l-orange-500 shadow-sm' 
                                : isEnrolled ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-[1.02] hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
                            )}
                            title={!isEnrolled ? 'Please enroll to access this material' : material.title}
                          >
                            <div className={cn(
                              "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all",
                              completedLessons.has(material.id) 
                                ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400' 
                                : selectedItem?.id === material.id
                                ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-600 dark:border-orange-500 text-orange-700 dark:text-orange-300'
                                : 'bg-background border-orange-200/50 dark:border-orange-800/50'
                            )}>
                              {completedLessons.has(material.id) ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : !isEnrolled ? (
                                <Lock className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{material.title}</p>
                              {material.duration_minutes && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5 font-medium">
                                  <Clock className="h-3 w-3" />
                                  {material.duration_minutes} min
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Empty State */}
                {totalItems === 0 && (
                  <div className="p-8 text-center">
                    <BookOpen className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                    <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">No content available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
