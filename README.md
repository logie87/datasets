# datasets
An interactive dataset education tool


Not sure as of yet as to what techstack to focus but the goal is to create an interactive
dataset viewer and library. It should allow users to upload and gain insights into datasets, providing
information on dataset entries, as well as what the dataset is able to be used for. 
Really just a way to educate the user about a specific dataset.
Currently everything here is a scratchpad for me.

I do aim to have a dataset library, something that people can access to get tons of unique datasets for
any specific purpose. If one doesn't exist, a synthetic data generator would be neat, lots to create around that idea I suppose.

For now, I want to focus on some main features:
-   Data Visualizers. This is something that I think would be cool. The biggest problem I have is that large ass CSV files are annoying
    to trace through, so something that could better present this would be awesome. Also, if the user wants to do something like a 
    test, having a more visual representation of different manipulations to a dataset, or outputs of a test would be neat. 

-   Of course as any app nowadays, an LLM (which really is needed for the idea anyways). If a user wants to find the relation
    between two things within a dataset, the LLM can not only provide the explanation to this connection, but also the code 
    needed to implement this in anything they might be working on (good extra step of verification for the user).
    More on this when I think about it more.

-   Data Cleaner. One thing I was annoyed with when working with raw brain data, was inconsistencies caused by external factors.
    For example, brain waves spike when the head moves. This is especially noticable when analyzing brain waves during focus.
    We used the gyroscopic data from the headset to cut out this noise, but it is annoying regardless, and it wasn't perfect.
    I'd like to have something that can flag noise, and outliers within a dataset, and provide a step-by-step tool a user can
    use to clean up data. This could be as simple as dropna(), or as complex as a 6 step process that incluedes dropping missing values, drop outliers defined by values >= 50, drop columns that are irrelevant to a specific need, etc.

-   Dataset library. These already exist, but having something that allows the user to find unique datasets. It will provide a ton
    of meaningful data about each dataset, and a list of examples of what the data was used for, including PROJECT examples! 

-   Synthetic Data Generator. This is something I'd like to design, which pretty much makes unique datasets based on a user query, and
    a set list of attributes specified. This could also be a paid service. Many exist already, but there is definitely more that
    could be done as models improve.

Main thing I can think of that will annoy me is big datasets cannot be fed into LLMs without causing problems.
Will need an efficient pipeline for this later on.


## Stack
A rough idea for now
#### Frontend - 
- Svelete, good performance for this since it will be pretty demanding I would presume. 
- Tailwind CSS
- TanStack for grids. (Maybe Glide)
- D3.js for visuals

#### Backend -
- ASP.NET for the main build, C#. Should be one of the faster options for this.
- Probably just PostgreSQL, not to overcomplicate.

#### LLM Stuffs -
- Ollama Python Library (for initial) 
- Will need a process that does some work on the dataset beforehand before feeding it into an LLM, this way it'll use less
  tokens and will be usable by said LLM. Things like size of dataset, means, variances, correlations, etc.


## More Notes
This will probably run like shit as a website, I don't think visualizing a large dataset is going to be easy, so will have to look into that. More javascript stuff I do not want to do. 
Also, can't really run an LLM online. Locally is fine for dev, this is fine for now, just a note for future.
I don't want this to use some cloud LLM, because then it just feels like a GPT Wrapper and that is lame.



#### Roadmap (Pre-LLM stuff)
- Implement statistical handler.
- Design basic synthetic data generator.
- Front end refinements.