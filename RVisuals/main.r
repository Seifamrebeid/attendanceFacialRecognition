# If not installed:
# install.packages("ggplot2")

library(ggplot2)

ggplot(mtcars, aes(x = factor(cyl), y = mpg)) +
  geom_boxplot(fill = "orange") +
  labs(title = "GGPlot2 Boxplot", x = "Cylinders", y = "MPG")
